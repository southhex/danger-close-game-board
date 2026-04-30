import { randomBytes } from 'node:crypto'
import argon2 from 'argon2'
import type { Database } from 'better-sqlite3'
import { db as defaultDb } from './db.js'

export const SESSION_TTL_DAYS = 30
export const SESSION_COOKIE = 'dc_session'

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id })
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain)
  } catch {
    return false
  }
}

export function generateSessionId(): string {
  return randomBytes(32).toString('hex')
}

interface SessionRow {
  user_id: number
  username: string
  expires_at: string
}

export function createSession(userId: number, db: Database = defaultDb): string {
  const sessionId = generateSessionId()
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')

  db.prepare<[string, number, string]>(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(sessionId, userId, expiresAt)

  return sessionId
}

export function validateSession(
  sessionId: string,
  db: Database = defaultDb
): { userId: number; username: string } | null {
  const row = db
    .prepare<[string], SessionRow>(
      `SELECT s.user_id, u.username, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > datetime('now')`
    )
    .get(sessionId)

  if (!row) return null

  return { userId: row.user_id, username: row.username }
}

export function deleteSession(sessionId: string, db: Database = defaultDb): void {
  db.prepare<[string]>('DELETE FROM sessions WHERE id = ?').run(sessionId)
}
