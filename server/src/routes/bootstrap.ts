import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import type { Context, Next } from 'hono'
import type { Database } from 'better-sqlite3'
import { db as defaultDb } from '../db.js'
import { SESSION_COOKIE, validateSession } from '../auth.js'

interface CampaignRow {
  id: string
  name: string
  description: string
  created_at: string
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

export function createBootstrapRoutes(db: Database = defaultDb): Hono {
  const router = new Hono()
  const requireAuth = makeRequireAuth(db)

  // GET / — bootstrap: user info + campaign list
  router.get('/', requireAuth, (c) => {
    const user = c.get('user')

    const campaigns = db
      .prepare<[], CampaignRow>(
        'SELECT id, name, description, created_at FROM campaigns ORDER BY created_at ASC'
      )
      .all()

    return c.json({
      user: { username: user.username },
      campaigns,
    })
  })

  return router
}

export const bootstrapRoutes = createBootstrapRoutes()
