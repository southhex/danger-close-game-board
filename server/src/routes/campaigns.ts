import { Hono } from 'hono'
import type { Database } from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { db as defaultDb } from '../db.js'
import { makeRequireAuth } from '../middleware.js'

interface CampaignRow {
  id: string
  name: string
  description: string
  current_mission: string | null
  created_at: string
}

interface TrooperRow {
  id: string
  data: string
  created_at: string
}

interface DiceRollRow {
  data: string
}

export function createCampaignRoutes(db: Database = defaultDb): Hono {
  const router = new Hono()
  const requireAuth = makeRequireAuth(db)

  // POST / — create campaign
  router.post('/', requireAuth, async (c) => {
    let body: { name?: unknown; description?: unknown }
    try {
      body = await c.req.json<{ name?: unknown; description?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const { name, description } = body

    if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
      return c.json({ error: 'name must be 1–100 characters' }, 400)
    }

    const id = randomUUID()
    const trimmedName = name.trim()
    const trimmedDesc = typeof description === 'string' ? description : ''

    db.prepare<[string, string, string]>(
      'INSERT INTO campaigns (id, name, description) VALUES (?, ?, ?)'
    ).run(id, trimmedName, trimmedDesc)

    const row = db
      .prepare<[string], CampaignRow>(
        'SELECT id, name, description, created_at FROM campaigns WHERE id = ?'
      )
      .get(id)

    return c.json({
      id: row!.id,
      name: row!.name,
      description: row!.description,
      created_at: row!.created_at,
    })
  })

  // GET /:id — get full campaign state
  router.get('/:id', requireAuth, (c) => {
    const id = c.req.param('id')

    const campaign = db
      .prepare<[string], CampaignRow>(
        'SELECT id, name, description, current_mission, created_at FROM campaigns WHERE id = ?'
      )
      .get(id)

    if (!campaign) {
      return c.json({ error: 'Campaign not found' }, 404)
    }

    const trooperRows = db
      .prepare<[string], TrooperRow>(
        'SELECT id, data, created_at FROM troopers WHERE campaign_id = ? ORDER BY created_at ASC'
      )
      .all(id)

    const diceRollRows = db
      .prepare<[string], DiceRollRow>(
        'SELECT data FROM dice_rolls WHERE campaign_id = ? ORDER BY id DESC LIMIT 20'
      )
      .all(id)

    return c.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        created_at: campaign.created_at,
      },
      troopers: trooperRows.map((r) => JSON.parse(r.data) as unknown),
      mission: campaign.current_mission ? (JSON.parse(campaign.current_mission) as unknown) : null,
      diceHistory: diceRollRows.map((r) => JSON.parse(r.data) as unknown),
    })
  })

  // PATCH /:id — rename/redescribe
  router.patch('/:id', requireAuth, async (c) => {
    const id = c.req.param('id')

    const campaign = db
      .prepare<[string], CampaignRow>('SELECT id, name, description, created_at FROM campaigns WHERE id = ?')
      .get(id)

    if (!campaign) {
      return c.json({ error: 'Campaign not found' }, 404)
    }

    let body: { name?: unknown; description?: unknown }
    try {
      body = await c.req.json<{ name?: unknown; description?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const { name, description } = body

    if (name === undefined && description === undefined) {
      return c.json({ error: 'At least one of name or description is required' }, 400)
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
        return c.json({ error: 'name must be 1–100 characters' }, 400)
      }
    }

    const newName = name !== undefined ? (name as string).trim() : campaign.name
    const newDesc = description !== undefined ? String(description) : campaign.description

    db.prepare<[string, string, string]>(
      'UPDATE campaigns SET name = ?, description = ? WHERE id = ?'
    ).run(newName, newDesc, id)

    const updated = db
      .prepare<[string], CampaignRow>(
        'SELECT id, name, description, created_at FROM campaigns WHERE id = ?'
      )
      .get(id)!

    return c.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      created_at: updated.created_at,
    })
  })

  // DELETE /:id — delete campaign
  router.delete('/:id', requireAuth, (c) => {
    const id = c.req.param('id')

    const campaign = db
      .prepare<[string], { id: string }>('SELECT id FROM campaigns WHERE id = ?')
      .get(id)

    if (!campaign) {
      return c.json({ error: 'Campaign not found' }, 404)
    }

    db.prepare<[string]>('DELETE FROM campaigns WHERE id = ?').run(id)

    return c.json({ ok: true })
  })

  // PUT /:id/state — full state replacement
  router.put('/:id/state', requireAuth, async (c) => {
    const id = c.req.param('id')

    const campaign = db
      .prepare<[string], { id: string }>('SELECT id FROM campaigns WHERE id = ?')
      .get(id)

    if (!campaign) {
      return c.json({ error: 'Campaign not found' }, 404)
    }

    let body: { troopers?: unknown; mission?: unknown; diceHistory?: unknown }
    try {
      body = await c.req.json<{ troopers?: unknown; mission?: unknown; diceHistory?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const troopers = Array.isArray(body.troopers) ? (body.troopers as unknown[]) : []
    const mission = body.mission !== undefined ? body.mission : null
    const diceHistory = Array.isArray(body.diceHistory)
      ? (body.diceHistory as unknown[]).slice(0, 20)
      : []

    const missionJson = mission !== null ? JSON.stringify(mission) : null

    db.transaction(() => {
      // 1. Delete all troopers for this campaign
      db.prepare<[string]>('DELETE FROM troopers WHERE campaign_id = ?').run(id)

      // 2. Insert each trooper
      const insertTrooper = db.prepare<[string, string, string, string]>(
        'INSERT INTO troopers (id, campaign_id, data, created_at) VALUES (?, ?, ?, ?)'
      )
      for (const trooper of troopers) {
        const t = trooper as Record<string, unknown>
        const trooperId =
          typeof t['id'] === 'string' && t['id'].length > 0 ? t['id'] : randomUUID()
        const trooperCreatedAt =
          typeof t['created_at'] === 'string' && t['created_at'].length > 0
            ? t['created_at']
            : new Date().toISOString()
        insertTrooper.run(trooperId, id, JSON.stringify(trooper), trooperCreatedAt)
      }

      // 3. Delete all dice_rolls for this campaign
      db.prepare<[string]>('DELETE FROM dice_rolls WHERE campaign_id = ?').run(id)

      // 4. Insert each dice roll
      const insertDiceRoll = db.prepare<[string, string]>(
        'INSERT INTO dice_rolls (campaign_id, data) VALUES (?, ?)'
      )
      for (const roll of diceHistory) {
        insertDiceRoll.run(id, JSON.stringify(roll))
      }

      // 5. Update current_mission
      db.prepare<[string | null, string]>(
        'UPDATE campaigns SET current_mission = ? WHERE id = ?'
      ).run(missionJson, id)
    })()

    return c.json({ ok: true })
  })

  return router
}

export const campaignRoutes = createCampaignRoutes()
