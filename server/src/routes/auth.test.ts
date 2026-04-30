import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'better-sqlite3'
import { Hono } from 'hono'
import { createTestDb } from '../db.js'
import { createAuthRoutes } from './auth.js'

function buildApp(db: Database): Hono {
  const app = new Hono()
  app.route('/api/auth', createAuthRoutes(db))
  return app
}

function extractCookie(res: Response, name: string): string | undefined {
  const header = res.headers.get('set-cookie')
  if (!header) return undefined
  const cookies = header.split(/,(?=[^;]+=[^;]*)/)
  for (const cookie of cookies) {
    const pair = cookie.trim().split(';')[0]
    const [key, value] = pair.split('=')
    if (key?.trim() === name) return value?.trim()
  }
  return undefined
}

describe('POST /api/auth/setup', () => {
  let db: Database
  let app: Hono

  beforeEach(() => {
    db = createTestDb()
    app = buildApp(db)
  })

  it('creates a user and returns a session cookie when no users exist', async () => {
    const res = await app.request('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { username: string }
    expect(body.username).toBe('admin')

    const cookie = extractCookie(res, 'dc_session')
    expect(cookie).toBeDefined()
    expect(typeof cookie).toBe('string')
    expect((cookie as string).length).toBeGreaterThan(0)

    // User was persisted
    const user = db.prepare<[], { username: string }>('SELECT username FROM users').get()
    expect(user?.username).toBe('admin')
  })

  it('fails with 403 when a user already exists', async () => {
    // Create first user
    await app.request('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' }),
    })

    // Try again
    const res = await app.request('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'other', password: 'password123' }),
    })

    expect(res.status).toBe(403)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/already/i)
  })

  it('fails with 400 for invalid username format', async () => {
    const res = await app.request('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ab', password: 'password123' }),
    })
    expect(res.status).toBe(400)
  })

  it('fails with 400 for password shorter than 8 chars', async () => {
    const res = await app.request('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'short' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  let db: Database
  let app: Hono

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    // Create a user first
    await app.request('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' }),
    })
  })

  it('succeeds with correct credentials and returns session cookie', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { username: string }
    expect(body.username).toBe('admin')

    const cookie = extractCookie(res, 'dc_session')
    expect(cookie).toBeDefined()
  })

  it('fails with 401 on wrong password', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
    })

    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Invalid credentials')
  })

  it('fails with 401 on unknown username', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nobody', password: 'password123' }),
    })

    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  let db: Database
  let app: Hono
  let sessionCookie: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    const res = await app.request('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' }),
    })
    const cookie = extractCookie(res, 'dc_session')
    sessionCookie = `dc_session=${cookie}`
  })

  it('returns username with valid cookie', async () => {
    const res = await app.request('/api/auth/me', {
      headers: { Cookie: sessionCookie },
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { username: string }
    expect(body.username).toBe('admin')
  })

  it('returns 401 without cookie', async () => {
    const res = await app.request('/api/auth/me')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/change-password', () => {
  let db: Database
  let app: Hono
  let sessionCookie: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    const res = await app.request('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'oldpassword' }),
    })
    const cookie = extractCookie(res, 'dc_session')
    sessionCookie = `dc_session=${cookie}`
  })

  it('succeeds with correct current password', async () => {
    const res = await app.request('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ currentPassword: 'oldpassword', newPassword: 'newpassword456' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)
  })

  it('old password no longer works after change', async () => {
    await app.request('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ currentPassword: 'oldpassword', newPassword: 'newpassword456' }),
    })

    // Login with old password should fail
    const loginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'oldpassword' }),
    })
    expect(loginRes.status).toBe(401)

    // Login with new password should succeed
    const newLoginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'newpassword456' }),
    })
    expect(newLoginRes.status).toBe(200)
  })

  it('fails with 401 when current password is wrong', async () => {
    const res = await app.request('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ currentPassword: 'wrongpassword', newPassword: 'newpassword456' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns 401 without auth cookie', async () => {
    const res = await app.request('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'oldpassword', newPassword: 'newpassword456' }),
    })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/logout', () => {
  let db: Database
  let app: Hono
  let sessionCookie: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    const res = await app.request('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' }),
    })
    const cookie = extractCookie(res, 'dc_session')
    sessionCookie = `dc_session=${cookie}`
  })

  it('clears session and returns ok', async () => {
    // Confirm session is valid before logout
    const meBefore = await app.request('/api/auth/me', {
      headers: { Cookie: sessionCookie },
    })
    expect(meBefore.status).toBe(200)

    // Logout
    const logoutRes = await app.request('/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    })
    expect(logoutRes.status).toBe(200)
    const body = await logoutRes.json() as { ok: boolean }
    expect(body.ok).toBe(true)

    // Session should be gone from DB
    const sessionCount = db
      .prepare<[], { count: number }>('SELECT COUNT(*) as count FROM sessions')
      .get()?.count ?? 0
    expect(sessionCount).toBe(0)
  })

  it('session cookie is cleared on logout', async () => {
    const logoutRes = await app.request('/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    })

    const setCookieHeader = logoutRes.headers.get('set-cookie')
    // The cookie should be cleared (max-age=0 or expires in the past, or empty value)
    expect(setCookieHeader).toBeTruthy()
    expect(setCookieHeader).toMatch(/dc_session/)
  })
})
