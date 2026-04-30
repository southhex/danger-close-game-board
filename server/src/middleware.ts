import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { db } from './db.js'
import { SESSION_COOKIE, validateSession } from './auth.js'

interface UserVar {
  userId: number
  username: string
}

declare module 'hono' {
  interface ContextVariableMap {
    user: UserVar
  }
}

// requireAuth using the singleton db — suitable for routes that don't inject a test db.
// Auth routes use their own injected version via makeRequireAuth in routes/auth.ts.
export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const sessionId = getCookie(c, SESSION_COOKIE)

  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const user = validateSession(sessionId)

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('user', user)
  await next()
}

// requireSetup — blocks the setup endpoint when a user already exists.
export async function requireSetup(c: Context, next: Next): Promise<Response | void> {
  const row = db.prepare<[], { count: number }>('SELECT COUNT(*) as count FROM users').get()
  const count = row?.count ?? 0

  if (count > 0) {
    return c.json({ error: 'Setup already completed' }, 403)
  }

  await next()
}
