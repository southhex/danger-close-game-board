import { Hono } from 'hono'
import type { Database } from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { db as defaultDb } from '../db.js'
import { makeRequireAuth } from '../middleware.js'

interface CampaignRow {
  id: string
  name: string
  description: string
  default_airspace: string
  req_enabled: number
  req: number
  current_mission_id: string | null
  created_at: string
}

interface SquadRow {
  id: string
  data: string
  created_at: string
}

interface MissionRow {
  id: string
  status: string
  data: string
  completed_at: string | null
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

interface GearRow {
  gear_name:   string
  stock:       number
  custom_name: string | null
  custom_req:  number | null
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
        'SELECT id, name, description, default_airspace, req_enabled, req, current_mission_id, created_at FROM campaigns WHERE id = ?'
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

    const squadRows = db
      .prepare<[string], SquadRow>(
        'SELECT id, data, created_at FROM squads WHERE campaign_id = ? ORDER BY created_at ASC'
      )
      .all(id)

    const missionRows = db
      .prepare<[string], MissionRow>(
        'SELECT id, status, data, completed_at, created_at FROM missions WHERE campaign_id = ? ORDER BY created_at ASC'
      )
      .all(id)

    const gearRows = db
      .prepare<[string], GearRow>(
        'SELECT gear_name, stock, custom_name, custom_req FROM campaign_gear WHERE campaign_id = ?'
      )
      .all(id)

    const missionsLite = missionRows.map((m) => {
      const data = JSON.parse(m.data) as Record<string, unknown>
      return {
        id: m.id,
        status: m.status,
        name: typeof data['name'] === 'string' ? (data['name'] as string) : '',
        // Include full blueprint data so the Mission Builder can hydrate without
        // a follow-up fetch. Live missions are returned in full via `currentMission`;
        // completed missions still get just the lite shape.
        data: m.status === 'blueprint' ? data : undefined,
        completed_at: m.completed_at,
        created_at: m.created_at,
      }
    })

    let currentMission: unknown = null
    if (campaign.current_mission_id) {
      const live = missionRows.find((m) => m.id === campaign.current_mission_id)
      if (live) {
        currentMission = {
          id: live.id,
          status: live.status,
          data: JSON.parse(live.data) as unknown,
          completed_at: live.completed_at,
          created_at: live.created_at,
        }
      }
    }

    return c.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        defaultAirspace: campaign.default_airspace,
        reqEnabled: campaign.req_enabled === 1,
        req: campaign.req,
        currentMissionId: campaign.current_mission_id,
        created_at: campaign.created_at,
      },
      troopers: trooperRows.map((r) => {
        const t = JSON.parse(r.data) as Record<string, unknown>
        if (!('squadId' in t))      t.squadId      = null
        if (!('recovering' in t))   t.recovering   = false
        if (!('wasBleedingOut' in t)) t.wasBleedingOut = false
        return t
      }),
      diceHistory: diceRollRows.map((r) => JSON.parse(r.data) as unknown),
      squads: squadRows.map((s) => ({
        id: s.id,
        data: JSON.parse(s.data) as unknown,
        created_at: s.created_at,
      })),
      missions: missionsLite,
      currentMission,
      campaignGear: gearRows.map(g => ({
        gearName:   g.gear_name,
        stock:      g.stock,
        customName: g.custom_name,
        customReq:  g.custom_req,
      })),
    })
  })

  // PATCH /:id — rename/redescribe; also defaultAirspace, reqEnabled
  router.patch('/:id', requireAuth, async (c) => {
    const id = c.req.param('id')

    const campaign = db
      .prepare<[string], CampaignRow>(
        'SELECT id, name, description, default_airspace, req_enabled, req, current_mission_id, created_at FROM campaigns WHERE id = ?'
      )
      .get(id)

    if (!campaign) {
      return c.json({ error: 'Campaign not found' }, 404)
    }

    let body: {
      name?: unknown
      description?: unknown
      defaultAirspace?: unknown
      reqEnabled?: unknown
    }
    try {
      body = await c.req.json<typeof body>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const { name, description, defaultAirspace, reqEnabled } = body

    if (
      name === undefined &&
      description === undefined &&
      defaultAirspace === undefined &&
      reqEnabled === undefined
    ) {
      return c.json(
        { error: 'At least one of name, description, defaultAirspace, reqEnabled is required' },
        400
      )
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
        return c.json({ error: 'name must be 1–100 characters' }, 400)
      }
    }

    if (defaultAirspace !== undefined) {
      if (
        typeof defaultAirspace !== 'string' ||
        !['contested', 'friendly', 'denied'].includes(defaultAirspace)
      ) {
        return c.json(
          { error: "defaultAirspace must be one of 'contested' | 'friendly' | 'denied'" },
          400
        )
      }
    }

    if (reqEnabled !== undefined && typeof reqEnabled !== 'boolean') {
      return c.json({ error: 'reqEnabled must be a boolean' }, 400)
    }

    const newName = name !== undefined ? (name as string).trim() : campaign.name
    const newDesc = description !== undefined ? String(description) : campaign.description
    const newAirspace =
      defaultAirspace !== undefined ? (defaultAirspace as string) : campaign.default_airspace
    const newReqEnabled =
      reqEnabled !== undefined ? ((reqEnabled as boolean) ? 1 : 0) : campaign.req_enabled

    db.prepare<[string, string, string, number, string]>(
      'UPDATE campaigns SET name = ?, description = ?, default_airspace = ?, req_enabled = ? WHERE id = ?'
    ).run(newName, newDesc, newAirspace, newReqEnabled, id)

    const updated = db
      .prepare<[string], CampaignRow>(
        'SELECT id, name, description, default_airspace, req_enabled, req, current_mission_id, created_at FROM campaigns WHERE id = ?'
      )
      .get(id)!

    return c.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      defaultAirspace: updated.default_airspace,
      reqEnabled: updated.req_enabled === 1,
      req: updated.req,
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

  // POST /:id/duplicate — full data copy to a new campaign
  router.post('/:id/duplicate', requireAuth, (c) => {
    const oldId = c.req.param('id')

    const campaign = db
      .prepare<[string], CampaignRow>(
        'SELECT id, name, description, default_airspace, req_enabled, req FROM campaigns WHERE id = ?'
      )
      .get(oldId)

    if (!campaign) return c.json({ error: 'Campaign not found' }, 404)

    const trooperRows = db
      .prepare<[string], TrooperRow>('SELECT id, data FROM troopers WHERE campaign_id = ?')
      .all(oldId)

    const squadRows = db
      .prepare<[string], SquadRow>('SELECT id, data FROM squads WHERE campaign_id = ?')
      .all(oldId)

    const missionRows = db
      .prepare<[string], MissionRow>(
        "SELECT id, status, data, completed_at FROM missions WHERE campaign_id = ? AND status != 'live'"
      )
      .all(oldId)

    const gearRows = db
      .prepare<[string], GearRow>(
        'SELECT gear_name, stock, custom_name, custom_req FROM campaign_gear WHERE campaign_id = ?'
      )
      .all(oldId)

    const newCampaignId = randomUUID()
    const trooperIdMap = new Map(trooperRows.map(r => [r.id, randomUUID()]))
    const squadIdMap   = new Map(squadRows.map(r => [r.id, randomUUID()]))

    db.transaction(() => {
      db.prepare<[string, string, string, string, number, number]>(
        'INSERT INTO campaigns (id, name, description, default_airspace, req_enabled, req) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(newCampaignId, `${campaign.name} (Copy)`, campaign.description, campaign.default_airspace, campaign.req_enabled, campaign.req)

      for (const row of trooperRows) {
        const data = JSON.parse(row.data) as Record<string, unknown>
        const newId = trooperIdMap.get(row.id)!
        data['id'] = newId
        if (typeof data['squadId'] === 'string' && squadIdMap.has(data['squadId'])) {
          data['squadId'] = squadIdMap.get(data['squadId'])
        }
        db.prepare<[string, string, string]>(
          'INSERT INTO troopers (id, campaign_id, data) VALUES (?, ?, ?)'
        ).run(newId, newCampaignId, JSON.stringify(data))
      }

      for (const row of squadRows) {
        const data = JSON.parse(row.data) as Record<string, unknown>
        const newId = squadIdMap.get(row.id)!
        if (typeof data['sergeantId'] === 'string' && trooperIdMap.has(data['sergeantId'])) {
          data['sergeantId'] = trooperIdMap.get(data['sergeantId'])
        }
        db.prepare<[string, string, string]>(
          'INSERT INTO squads (id, campaign_id, data) VALUES (?, ?, ?)'
        ).run(newId, newCampaignId, JSON.stringify(data))
      }

      for (const row of missionRows) {
        const newId = randomUUID()
        const data = JSON.parse(row.data) as Record<string, unknown>
        data['id'] = newId
        if (typeof data['squadId'] === 'string' && squadIdMap.has(data['squadId'])) {
          data['squadId'] = squadIdMap.get(data['squadId'])
        }
        db.prepare<[string, string, string, string, string | null]>(
          'INSERT INTO missions (id, campaign_id, status, data, completed_at) VALUES (?, ?, ?, ?, ?)'
        ).run(newId, newCampaignId, row.status, JSON.stringify(data), row.completed_at)
      }

      for (const row of gearRows) {
        db.prepare<[string, string, number, string | null, number | null]>(
          'INSERT INTO campaign_gear (campaign_id, gear_name, stock, custom_name, custom_req) VALUES (?, ?, ?, ?, ?)'
        ).run(newCampaignId, row.gear_name, row.stock, row.custom_name, row.custom_req)
      }
    })()

    return c.json({ id: newCampaignId, name: `${campaign.name} (Copy)` })
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

    let body: { troopers?: unknown; diceHistory?: unknown }
    try {
      body = await c.req.json<{ troopers?: unknown; diceHistory?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const troopers = Array.isArray(body.troopers) ? (body.troopers as unknown[]) : []
    const diceHistory = Array.isArray(body.diceHistory)
      ? (body.diceHistory as unknown[]).slice(0, 20)
      : []

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
    })()

    return c.json({ ok: true })
  })

  return router
}

export const campaignRoutes = createCampaignRoutes()
