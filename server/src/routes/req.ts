import { Hono } from 'hono'
import type { Database } from 'better-sqlite3'
import { db as defaultDb } from '../db.js'
import { makeRequireAuth } from '../middleware.js'

interface CampaignRow {
  id: string
  req: number
  req_enabled: number
}

interface TrooperRow {
  id: string
  data: string
}

export function createReqRoutes(db: Database = defaultDb): Hono {
  const router = new Hono()
  const requireAuth = makeRequireAuth(db)

  // PATCH /campaigns/:id/req — direct edit
  router.patch('/campaigns/:id/req', requireAuth, async (c) => {
    const id = c.req.param('id')

    const campaign = db
      .prepare<[string], CampaignRow>(
        'SELECT id, req, req_enabled FROM campaigns WHERE id = ?'
      )
      .get(id)
    if (!campaign) return c.json({ error: 'Campaign not found' }, 404)

    let body: { req?: unknown }
    try {
      body = await c.req.json<{ req?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    if (
      typeof body.req !== 'number' ||
      !Number.isFinite(body.req) ||
      body.req < 0 ||
      Math.floor(body.req) !== body.req
    ) {
      return c.json({ error: 'req must be a non-negative integer' }, 400)
    }

    db.prepare<[number, string]>('UPDATE campaigns SET req = ? WHERE id = ?').run(body.req, id)

    return c.json({ id, req: body.req })
  })

  // POST /campaigns/:id/req/spend — atomic spend
  router.post('/campaigns/:id/req/spend', requireAuth, async (c) => {
    const id = c.req.param('id')

    const campaign = db
      .prepare<[string], CampaignRow>(
        'SELECT id, req, req_enabled FROM campaigns WHERE id = ?'
      )
      .get(id)
    if (!campaign) return c.json({ error: 'Campaign not found' }, 404)

    let body: { amount?: unknown; trooperId?: unknown; gearChange?: unknown }
    try {
      body = await c.req.json<{ amount?: unknown; trooperId?: unknown; gearChange?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const amount = body.amount
    const trooperId = body.trooperId
    const gearChange = body.gearChange

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return c.json({ error: 'amount must be a positive number' }, 400)
    }
    if (typeof trooperId !== 'string' || trooperId.length === 0) {
      return c.json({ error: 'trooperId required' }, 400)
    }
    if (!gearChange || typeof gearChange !== 'object') {
      return c.json({ error: 'gearChange object required' }, 400)
    }

    const trooper = db
      .prepare<[string, string], TrooperRow>(
        'SELECT id, data FROM troopers WHERE id = ? AND campaign_id = ?'
      )
      .get(trooperId, id)
    if (!trooper) return c.json({ error: 'Trooper not found in this campaign' }, 404)

    if (campaign.req < amount) {
      return c.json({ error: 'Insufficient REQ' }, 409)
    }

    const trooperData = JSON.parse(trooper.data) as Record<string, unknown>
    const change = gearChange as { slot?: unknown; name?: unknown }
    if (typeof change.slot !== 'string' || change.slot.length === 0) {
      return c.json({ error: 'gearChange.slot required' }, 400)
    }
    if (change.name !== null && typeof change.name !== 'string') {
      return c.json({ error: 'gearChange.name must be string or null' }, 400)
    }
    trooperData[change.slot] = change.name

    db.transaction(() => {
      db.prepare<[number, string]>('UPDATE campaigns SET req = req - ? WHERE id = ?').run(
        amount,
        id
      )
      db.prepare<[string, string]>('UPDATE troopers SET data = ? WHERE id = ?').run(
        JSON.stringify(trooperData),
        trooperId
      )
    })()

    const updated = db
      .prepare<[string], CampaignRow>('SELECT id, req, req_enabled FROM campaigns WHERE id = ?')
      .get(id)!

    return c.json({
      id,
      req: updated.req,
      trooper: { id: trooperId, data: trooperData },
    })
  })

  return router
}

export const reqRoutes = createReqRoutes()
