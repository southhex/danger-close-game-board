import { Hono } from 'hono'
import type { Database } from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { db as defaultDb } from '../db.js'
import { makeRequireAuth } from '../middleware.js'

interface SquadRow {
  id: string
  campaign_id: string
  data: string
  created_at: string
}

export function createSquadRoutes(db: Database = defaultDb): Hono {
  const router = new Hono()
  const requireAuth = makeRequireAuth(db)

  // POST /campaigns/:campaignId/squads — create
  router.post('/campaigns/:campaignId/squads', requireAuth, async (c) => {
    const campaignId = c.req.param('campaignId')

    const campaign = db
      .prepare<[string], { id: string }>('SELECT id FROM campaigns WHERE id = ?')
      .get(campaignId)
    if (!campaign) return c.json({ error: 'Campaign not found' }, 404)

    let body: { data?: unknown }
    try {
      body = await c.req.json<{ data?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    if (!body.data || typeof body.data !== 'object') {
      return c.json({ error: 'data object required' }, 400)
    }

    const id = randomUUID()
    const dataJson = JSON.stringify(body.data)

    db.prepare<[string, string, string]>(
      'INSERT INTO squads (id, campaign_id, data) VALUES (?, ?, ?)'
    ).run(id, campaignId, dataJson)

    const row = db
      .prepare<[string], SquadRow>(
        'SELECT id, campaign_id, data, created_at FROM squads WHERE id = ?'
      )
      .get(id)!

    return c.json({
      id: row.id,
      campaignId: row.campaign_id,
      data: JSON.parse(row.data) as unknown,
      created_at: row.created_at,
    })
  })

  // PATCH /squads/:id — replace data blob
  router.patch('/squads/:id', requireAuth, async (c) => {
    const id = c.req.param('id')

    const existing = db
      .prepare<[string], SquadRow>(
        'SELECT id, campaign_id, data, created_at FROM squads WHERE id = ?'
      )
      .get(id)
    if (!existing) return c.json({ error: 'Squad not found' }, 404)

    let body: { data?: unknown }
    try {
      body = await c.req.json<{ data?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    if (!body.data || typeof body.data !== 'object') {
      return c.json({ error: 'data object required' }, 400)
    }

    db.prepare<[string, string]>('UPDATE squads SET data = ? WHERE id = ?').run(
      JSON.stringify(body.data),
      id
    )

    return c.json({
      id,
      campaignId: existing.campaign_id,
      data: body.data,
      created_at: existing.created_at,
    })
  })

  // DELETE /squads/:id
  router.delete('/squads/:id', requireAuth, (c) => {
    const id = c.req.param('id')
    const existing = db
      .prepare<[string], { id: string }>('SELECT id FROM squads WHERE id = ?')
      .get(id)
    if (!existing) return c.json({ error: 'Squad not found' }, 404)
    db.prepare<[string]>('DELETE FROM squads WHERE id = ?').run(id)
    return c.json({ ok: true })
  })

  return router
}

export const squadRoutes = createSquadRoutes()
