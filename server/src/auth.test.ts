import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'better-sqlite3'
import { createTestDb } from './db.js'
import {
  hashPassword,
  verifyPassword,
  generateSessionId,
  createSession,
  validateSession,
  deleteSession,
} from './auth.js'

describe('hashPassword / verifyPassword', () => {
  it('round-trip: hashing then verifying returns true', async () => {
    const hash = await hashPassword('correct-password')
    expect(await verifyPassword('correct-password', hash)).toBe(true)
  })

  it('wrong password returns false', async () => {
    const hash = await hashPassword('correct-password')
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
  })
})

describe('generateSessionId', () => {
  it('returns a 64-char hex string', () => {
    const id = generateSessionId()
    expect(id).toHaveLength(64)
    expect(/^[0-9a-f]{64}$/.test(id)).toBe(true)
  })

  it('two calls produce different values', () => {
    const a = generateSessionId()
    const b = generateSessionId()
    expect(a).not.toBe(b)
  })
})

describe('createSession', () => {
  let db: Database

  beforeEach(() => {
    db = createTestDb()
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(
      'testuser',
      'fakehash'
    )
  })

  it('inserts a row in the sessions table and returns a session ID', () => {
    const userId = (
      db.prepare<[], { id: number }>('SELECT id FROM users WHERE username = ?')
        // @ts-expect-error - passing string arg to typed empty params for brevity
        .get('testuser') as { id: number }
    ).id

    const sessionId = createSession(userId, db)

    expect(typeof sessionId).toBe('string')
    expect(sessionId).toHaveLength(64)

    const row = db
      .prepare<[string], { user_id: number }>('SELECT user_id FROM sessions WHERE id = ?')
      .get(sessionId)

    expect(row).not.toBeNull()
    expect(row?.user_id).toBe(userId)
  })
})

describe('validateSession', () => {
  let db: Database
  let userId: number

  beforeEach(() => {
    db = createTestDb()
    const result = db
      .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run('testuser', 'fakehash')
    userId = result.lastInsertRowid as number
  })

  it('returns user info for a valid session', () => {
    const sessionId = createSession(userId, db)
    const result = validateSession(sessionId, db)

    expect(result).not.toBeNull()
    expect(result?.userId).toBe(userId)
    expect(result?.username).toBe('testuser')
  })

  it('returns null for an expired session', () => {
    const sessionId = generateSessionId()
    // Insert an already-expired session
    db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
      sessionId,
      userId,
      '2000-01-01 00:00:00'
    )

    const result = validateSession(sessionId, db)
    expect(result).toBeNull()
  })

  it('returns null for a non-existent session ID', () => {
    const result = validateSession('nonexistent-session-id', db)
    expect(result).toBeNull()
  })
})

describe('deleteSession', () => {
  let db: Database
  let userId: number

  beforeEach(() => {
    db = createTestDb()
    const result = db
      .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run('testuser', 'fakehash')
    userId = result.lastInsertRowid as number
  })

  it('removes the session row', () => {
    const sessionId = createSession(userId, db)

    // Session exists
    expect(validateSession(sessionId, db)).not.toBeNull()

    deleteSession(sessionId, db)

    // Session gone
    const row = db
      .prepare<[string], { id: string }>('SELECT id FROM sessions WHERE id = ?')
      .get(sessionId)
    expect(row).toBeUndefined()
  })
})
