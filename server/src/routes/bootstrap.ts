import { Hono } from 'hono'
import type { Database } from 'better-sqlite3'
import { db as defaultDb } from '../db.js'
import { makeRequireAuth } from '../middleware.js'

interface CampaignRow {
  id: string
  name: string
  description: string
  created_at: string
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
