import { Hono } from 'hono'
import type { Database } from 'better-sqlite3'
import { db as defaultDb } from '../db.js'
import { makeRequireAuth } from '../middleware.js'

interface CampaignRow {
  id: string
  req: number
  req_enabled: number
}

interface GearRow {
  gear_name:   string
  stock:       number
  custom_name: string | null
  custom_req:  number | null
}

export function createGearRoutes(db: Database = defaultDb): Hono {
  const router = new Hono()
  const requireAuth = makeRequireAuth(db)

  // POST /campaigns/:id/gear/buy — buy stock for a tracked item
  router.post('/campaigns/:id/gear/buy', requireAuth, async (c) => {
    const campaignId = c.req.param('id')

    const campaign = db
      .prepare<[string], CampaignRow>('SELECT id, req, req_enabled FROM campaigns WHERE id = ?')
      .get(campaignId)
    if (!campaign) return c.json({ error: 'Campaign not found' }, 404)

    let body: { gearName?: unknown; qty?: unknown; catalogueReq?: unknown }
    try {
      body = await c.req.json<{ gearName?: unknown; qty?: unknown; catalogueReq?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    if (typeof body.gearName !== 'string' || body.gearName.length === 0)
      return c.json({ error: 'gearName required' }, 400)
    if (typeof body.qty !== 'number' || !Number.isInteger(body.qty) || body.qty < 1)
      return c.json({ error: 'qty must be a positive integer' }, 400)

    const gearName = body.gearName
    const qty      = body.qty as number

    // Resolve effective REQ cost (custom_req takes precedence)
    const existing = db
      .prepare<[string, string], GearRow>(
        'SELECT gear_name, stock, custom_name, custom_req FROM campaign_gear WHERE campaign_id = ? AND gear_name = ?'
      )
      .get(campaignId, gearName)

    // Effective REQ cost comes from custom_req if set; otherwise the caller
    // supplies the catalogue default via body. We trust the client here because
    // the catalogue lives on the frontend — the server only enforces what it knows.
    const catalogueReq = typeof body.catalogueReq === 'number' ? body.catalogueReq : 0
    const effectiveReq: number =
      existing?.custom_req !== null && existing?.custom_req !== undefined
        ? existing.custom_req
        : catalogueReq

    const totalCost = effectiveReq * qty

    if (totalCost > 0 && campaign.req < totalCost)
      return c.json({ error: 'Insufficient REQ' }, 409)

    db.transaction(() => {
      db.prepare<[string, string, number]>(
        `INSERT INTO campaign_gear (campaign_id, gear_name, stock)
         VALUES (?, ?, ?)
         ON CONFLICT(campaign_id, gear_name) DO UPDATE SET stock = stock + excluded.stock`
      ).run(campaignId, gearName, qty)

      if (totalCost > 0) {
        db.prepare<[number, string]>('UPDATE campaigns SET req = req - ? WHERE id = ?').run(totalCost, campaignId)
      }
    })()

    const updatedCampaign = db
      .prepare<[string], { req: number }>('SELECT req FROM campaigns WHERE id = ?')
      .get(campaignId)!

    const updatedGear = db
      .prepare<[string, string], GearRow>(
        'SELECT gear_name, stock, custom_name, custom_req FROM campaign_gear WHERE campaign_id = ? AND gear_name = ?'
      )
      .get(campaignId, gearName)!

    return c.json({
      req: updatedCampaign.req,
      gear: {
        gearName:   updatedGear.gear_name,
        stock:      updatedGear.stock,
        customName: updatedGear.custom_name,
        customReq:  updatedGear.custom_req,
      },
    })
  })

  // PATCH /campaigns/:id/gear/:gearName — update custom name or custom REQ
  router.patch('/campaigns/:id/gear/:gearName', requireAuth, async (c) => {
    const campaignId = c.req.param('id')
    const gearName   = decodeURIComponent(c.req.param('gearName'))

    const campaign = db
      .prepare<[string], { id: string }>('SELECT id FROM campaigns WHERE id = ?')
      .get(campaignId)
    if (!campaign) return c.json({ error: 'Campaign not found' }, 404)

    let body: { customName?: unknown; customReq?: unknown }
    try {
      body = await c.req.json<{ customName?: unknown; customReq?: unknown }>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    if (body.customName !== undefined && body.customName !== null && typeof body.customName !== 'string')
      return c.json({ error: 'customName must be a string or null' }, 400)
    if (body.customReq !== undefined && body.customReq !== null) {
      if (typeof body.customReq !== 'number' || !Number.isInteger(body.customReq) || (body.customReq as number) < 0)
        return c.json({ error: 'customReq must be a non-negative integer or null' }, 400)
    }

    db.prepare<[string, string]>(
      `INSERT INTO campaign_gear (campaign_id, gear_name) VALUES (?, ?)
       ON CONFLICT(campaign_id, gear_name) DO NOTHING`
    ).run(campaignId, gearName)

    if (body.customName !== undefined) {
      db.prepare<[string | null, string, string]>(
        'UPDATE campaign_gear SET custom_name = ? WHERE campaign_id = ? AND gear_name = ?'
      ).run((body.customName as string | null) ?? null, campaignId, gearName)
    }
    if (body.customReq !== undefined) {
      db.prepare<[number | null, string, string]>(
        'UPDATE campaign_gear SET custom_req = ? WHERE campaign_id = ? AND gear_name = ?'
      ).run((body.customReq as number | null) ?? null, campaignId, gearName)
    }

    const updated = db
      .prepare<[string, string], GearRow>(
        'SELECT gear_name, stock, custom_name, custom_req FROM campaign_gear WHERE campaign_id = ? AND gear_name = ?'
      )
      .get(campaignId, gearName)!

    return c.json({
      gearName:   updated.gear_name,
      stock:      updated.stock,
      customName: updated.custom_name,
      customReq:  updated.custom_req,
    })
  })

  return router
}

export const gearRoutes = createGearRoutes()
