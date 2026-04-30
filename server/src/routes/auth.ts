import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import type { Context, Next } from 'hono'
import type { Database } from 'better-sqlite3'
import { db as defaultDb } from '../db.js'
import {
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
  validateSession,
  SESSION_COOKIE,
  SESSION_TTL_DAYS,
} from '../auth.js'

interface UserRow {
  id: number
  username: string
  password_hash: string
}

interface CountRow {
  count: number
}

interface UserVar {
  userId: number
  username: string
}

declare module 'hono' {
  interface ContextVariableMap {
    user: UserVar
  }
}

const MAX_AGE = SESSION_TTL_DAYS * 24 * 60 * 60

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'Lax' as const,
    path: '/',
    maxAge: MAX_AGE,
    ...(process.env.NODE_ENV === 'production' ? { secure: true } : {}),
  }
}

function makeRequireAuth(db: Database) {
  return async function requireAuth(c: Context, next: Next): Promise<Response | void> {
    const sessionId = getCookie(c, SESSION_COOKIE)

    if (!sessionId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const user = validateSession(sessionId, db)

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    c.set('user', user)
    await next()
  }
}

function makeRequireSetup(db: Database) {
  return async function requireSetup(c: Context, next: Next): Promise<Response | void> {
    const row = db.prepare<[], { count: number }>('SELECT COUNT(*) as count FROM users').get()
    const count = row?.count ?? 0

    if (count > 0) {
      return c.json({ error: 'Setup already completed', setupRequired: true }, 403)
    }

    await next()
  }
}

export function createAuthRoutes(db: Database = defaultDb): Hono {
  const router = new Hono()
  const requireAuth = makeRequireAuth(db)
  const requireSetup = makeRequireSetup(db)

  // POST /setup — one-time user creation (only when no users exist)
  router.post('/setup', requireSetup, async (c) => {
    let body: { username?: unknown; password?: unknown }
    try {
      body = await c.req.json<{ username?: unknown; password?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const { username, password } = body

    if (typeof username !== 'string' || typeof password !== 'string') {
      return c.json({ error: 'username and password are required' }, 400)
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return c.json(
        {
          error:
            'Username must be 3–30 characters and contain only letters, numbers, or underscores',
        },
        400
      )
    }

    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400)
    }

    const passwordHash = await hashPassword(password)

    const result = db
      .prepare<[string, string]>('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run(username, passwordHash)

    const userId = result.lastInsertRowid as number
    const sessionId = createSession(userId, db)

    setCookie(c, SESSION_COOKIE, sessionId, cookieOptions())

    return c.json({ username })
  })

  // POST /login
  router.post('/login', async (c) => {
    let body: { username?: unknown; password?: unknown }
    try {
      body = await c.req.json<{ username?: unknown; password?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const { username, password } = body

    if (typeof username !== 'string' || typeof password !== 'string') {
      return c.json({ error: 'username and password are required' }, 400)
    }

    const user = db
      .prepare<[string], UserRow>(
        'SELECT id, username, password_hash FROM users WHERE username = ?'
      )
      .get(username)

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const valid = await verifyPassword(password, user.password_hash)

    if (!valid) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const sessionId = createSession(user.id, db)
    setCookie(c, SESSION_COOKIE, sessionId, cookieOptions())

    return c.json({ username: user.username })
  })

  // POST /logout
  router.post('/logout', (c) => {
    const sessionId = getCookie(c, SESSION_COOKIE)

    if (sessionId) {
      deleteSession(sessionId, db)
    }

    deleteCookie(c, SESSION_COOKIE, { path: '/' })

    return c.json({ ok: true })
  })

  // POST /change-password — requires auth
  router.post('/change-password', requireAuth, async (c) => {
    const user = c.get('user')

    let body: { currentPassword?: unknown; newPassword?: unknown }
    try {
      body = await c.req.json<{ currentPassword?: unknown; newPassword?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const { currentPassword, newPassword } = body

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return c.json({ error: 'currentPassword and newPassword are required' }, 400)
    }

    if (newPassword.length < 8) {
      return c.json({ error: 'New password must be at least 8 characters' }, 400)
    }

    const row = db
      .prepare<[number], { password_hash: string }>('SELECT password_hash FROM users WHERE id = ?')
      .get(user.userId)

    if (!row) {
      return c.json({ error: 'User not found' }, 404)
    }

    const valid = await verifyPassword(currentPassword, row.password_hash)

    if (!valid) {
      return c.json({ error: 'Current password is incorrect' }, 401)
    }

    const newHash = await hashPassword(newPassword)

    db.prepare<[string, number]>('UPDATE users SET password_hash = ? WHERE id = ?').run(
      newHash,
      user.userId
    )

    return c.json({ ok: true })
  })

  // GET /me — requires auth
  router.get('/me', requireAuth, (c) => {
    const user = c.get('user')
    return c.json({ username: user.username })
  })

  return router
}

export const authRoutes = createAuthRoutes()
