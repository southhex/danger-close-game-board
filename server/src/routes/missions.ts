import { Hono } from 'hono'
import type { Database } from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { db as defaultDb } from '../db.js'
import { makeRequireAuth } from '../middleware.js'

interface MissionRow {
  id: string
  campaign_id: string
  status: string
  data: string
  completed_at: string | null
  created_at: string
}

interface CampaignRow {
  id: string
  req_enabled: number
  req: number
  current_mission_id: string | null
}

function rowToMission(row: MissionRow): {
  id: string
  campaignId: string
  status: string
  data: unknown
  completed_at: string | null
  created_at: string
} {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    status: row.status,
    data: JSON.parse(row.data) as unknown,
    completed_at: row.completed_at,
    created_at: row.created_at,
  }
}

export function createMissionRoutes(db: Database = defaultDb): Hono {
  const router = new Hono()
  const requireAuth = makeRequireAuth(db)

  // POST /campaigns/:campaignId/missions — create blueprint
  router.post('/campaigns/:campaignId/missions', requireAuth, async (c) => {
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
    db.prepare<[string, string, string]>(
      "INSERT INTO missions (id, campaign_id, status, data) VALUES (?, ?, 'blueprint', ?)"
    ).run(id, campaignId, JSON.stringify(body.data))

    const row = db
      .prepare<[string], MissionRow>(
        'SELECT id, campaign_id, status, data, completed_at, created_at FROM missions WHERE id = ?'
      )
      .get(id)!

    return c.json(rowToMission(row))
  })

  // PATCH /missions/:id — only when blueprint
  router.patch('/missions/:id', requireAuth, async (c) => {
    const id = c.req.param('id')

    const existing = db
      .prepare<[string], MissionRow>(
        'SELECT id, campaign_id, status, data, completed_at, created_at FROM missions WHERE id = ?'
      )
      .get(id)
    if (!existing) return c.json({ error: 'Mission not found' }, 404)

    let body: { data?: unknown; fieldReport?: unknown }
    try {
      body = await c.req.json<{ data?: unknown; fieldReport?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    if (existing.status === 'blueprint') {
      if (!body.data || typeof body.data !== 'object') {
        return c.json({ error: 'data object required' }, 400)
      }
      db.prepare<[string, string]>('UPDATE missions SET data = ? WHERE id = ?').run(
        JSON.stringify(body.data),
        id
      )
    } else if (existing.status === 'completed') {
      // Stage 8 will allow editing fieldReport on completed missions; for Stage 1
      // we accept the same operation if fieldReport is provided.
      if (typeof body.fieldReport !== 'string') {
        return c.json({ error: 'Only fieldReport can be edited on a completed mission' }, 400)
      }
      const data = JSON.parse(existing.data) as Record<string, unknown>
      data['fieldReport'] = body.fieldReport
      db.prepare<[string, string]>('UPDATE missions SET data = ? WHERE id = ?').run(
        JSON.stringify(data),
        id
      )
    } else {
      return c.json({ error: `Cannot PATCH a mission with status '${existing.status}'` }, 409)
    }

    const row = db
      .prepare<[string], MissionRow>(
        'SELECT id, campaign_id, status, data, completed_at, created_at FROM missions WHERE id = ?'
      )
      .get(id)!
    return c.json(rowToMission(row))
  })

  // DELETE /missions/:id — only blueprint or completed
  router.delete('/missions/:id', requireAuth, (c) => {
    const id = c.req.param('id')
    const existing = db
      .prepare<[string], MissionRow>(
        'SELECT id, campaign_id, status, data, completed_at, created_at FROM missions WHERE id = ?'
      )
      .get(id)
    if (!existing) return c.json({ error: 'Mission not found' }, 404)
    if (existing.status === 'live') {
      return c.json({ error: 'Cannot delete a live mission' }, 409)
    }
    db.prepare<[string]>('DELETE FROM missions WHERE id = ?').run(id)
    return c.json({ ok: true })
  })

  // POST /missions/:id/deploy — blueprint → live
  router.post('/missions/:id/deploy', requireAuth, async (c) => {
    const id = c.req.param('id')

    const existing = db
      .prepare<[string], MissionRow>(
        'SELECT id, campaign_id, status, data, completed_at, created_at FROM missions WHERE id = ?'
      )
      .get(id)
    if (!existing) return c.json({ error: 'Mission not found' }, 404)
    if (existing.status !== 'blueprint') {
      return c.json({ error: `Cannot deploy a mission with status '${existing.status}'` }, 409)
    }

    let body: { squadId?: unknown }
    try {
      body = await c.req.json<{ squadId?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }
    if (typeof body.squadId !== 'string' || body.squadId.length === 0) {
      return c.json({ error: 'squadId required' }, 400)
    }

    const squad = db
      .prepare<[string, string], { id: string }>(
        'SELECT id FROM squads WHERE id = ? AND campaign_id = ?'
      )
      .get(body.squadId, existing.campaign_id)
    if (!squad) return c.json({ error: 'Squad not found in this campaign' }, 404)

    const data = JSON.parse(existing.data) as Record<string, unknown>
    data['squadId'] = body.squadId
    data['status'] = 'live'

    db.transaction(() => {
      db.prepare<[string, string]>(
        "UPDATE missions SET status = 'live', data = ? WHERE id = ?"
      ).run(JSON.stringify(data), id)
      db.prepare<[string, string]>(
        'UPDATE campaigns SET current_mission_id = ? WHERE id = ?'
      ).run(id, existing.campaign_id)
    })()

    const row = db
      .prepare<[string], MissionRow>(
        'SELECT id, campaign_id, status, data, completed_at, created_at FROM missions WHERE id = ?'
      )
      .get(id)!
    return c.json(rowToMission(row))
  })

  // POST /missions/:id/complete — live → completed
  router.post('/missions/:id/complete', requireAuth, async (c) => {
    const id = c.req.param('id')

    const existing = db
      .prepare<[string], MissionRow>(
        'SELECT id, campaign_id, status, data, completed_at, created_at FROM missions WHERE id = ?'
      )
      .get(id)
    if (!existing) return c.json({ error: 'Mission not found' }, 404)
    if (existing.status !== 'live') {
      return c.json({ error: `Cannot complete a mission with status '${existing.status}'` }, 409)
    }

    let body: { fieldReport?: unknown; outcome?: unknown; awardedReq?: unknown }
    try {
      body = await c.req.json<{ fieldReport?: unknown; outcome?: unknown; awardedReq?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const fieldReport = typeof body.fieldReport === 'string' ? body.fieldReport : ''
    const outcome = typeof body.outcome === 'string' ? body.outcome : 'victory'
    const awardedReq =
      typeof body.awardedReq === 'number' && Number.isFinite(body.awardedReq) && body.awardedReq >= 0
        ? Math.floor(body.awardedReq)
        : 0

    const campaign = db
      .prepare<[string], CampaignRow>(
        'SELECT id, req_enabled, req, current_mission_id FROM campaigns WHERE id = ?'
      )
      .get(existing.campaign_id)!

    const data = JSON.parse(existing.data) as Record<string, unknown>
    data['fieldReport'] = fieldReport
    data['outcome'] = outcome
    data['status'] = 'completed'

    const completedAt = new Date().toISOString()
    const reqDelta = campaign.req_enabled === 1 ? awardedReq : 0

    db.transaction(() => {
      db.prepare<[string, string, string]>(
        "UPDATE missions SET status = 'completed', data = ?, completed_at = ? WHERE id = ?"
      ).run(JSON.stringify(data), completedAt, id)
      db.prepare<[string]>(
        'UPDATE campaigns SET current_mission_id = NULL WHERE id = ?'
      ).run(existing.campaign_id)
      if (reqDelta > 0) {
        db.prepare<[number, string]>(
          'UPDATE campaigns SET req = req + ? WHERE id = ?'
        ).run(reqDelta, existing.campaign_id)
      }
    })()

    const row = db
      .prepare<[string], MissionRow>(
        'SELECT id, campaign_id, status, data, completed_at, created_at FROM missions WHERE id = ?'
      )
      .get(id)!
    const updatedCampaign = db
      .prepare<[string], CampaignRow>(
        'SELECT id, req_enabled, req, current_mission_id FROM campaigns WHERE id = ?'
      )
      .get(existing.campaign_id)!

    return c.json({
      mission: rowToMission(row),
      reqAwarded: reqDelta,
      campaignReq: updatedCampaign.req,
    })
  })

  // PUT /missions/:id/state — full Mission JSON replacement (live only)
  router.put('/missions/:id/state', requireAuth, async (c) => {
    const id = c.req.param('id')

    const existing = db
      .prepare<[string], MissionRow>(
        'SELECT id, campaign_id, status, data, completed_at, created_at FROM missions WHERE id = ?'
      )
      .get(id)
    if (!existing) return c.json({ error: 'Mission not found' }, 404)
    if (existing.status !== 'live') {
      return c.json({ error: 'Only live missions accept state PUT' }, 409)
    }

    let body: { data?: unknown }
    try {
      body = await c.req.json<{ data?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }
    if (!body.data || typeof body.data !== 'object') {
      return c.json({ error: 'data object required' }, 400)
    }

    db.prepare<[string, string]>('UPDATE missions SET data = ? WHERE id = ?').run(
      JSON.stringify(body.data),
      id
    )

    return c.json({ ok: true })
  })

  return router
}

export const missionRoutes = createMissionRoutes()
