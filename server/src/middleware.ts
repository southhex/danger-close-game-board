import type { Context, Next, MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import type { Database } from 'better-sqlite3'
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

// Factory: create a requireAuth middleware bound to a specific db instance.
// Use this in route factories that accept an injected db for testability.
export function makeRequireAuth(db: Database): MiddlewareHandler {
  return async function requireAuth(c: Context, next: Next): Promise<Response | void> {
    const sessionId = getCookie(c, SESSION_COOKIE)
    if (!sessionId) return c.json({ error: 'Unauthorized' }, 401)
    const user = validateSession(sessionId, db)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    c.set('user', user)
    await next()
  }
}

// requireAuth using the singleton db — suitable for routes that don't inject a test db.
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
    return c.json({ error: 'Setup already completed', setupRequired: true }, 403)
  }

  await next()
}
