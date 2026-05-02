import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'better-sqlite3'
import { Hono } from 'hono'
import { createTestDb } from '../db.js'
import { createAuthRoutes } from './auth.js'
import { createCampaignRoutes } from './campaigns.js'
import { createReqRoutes } from './req.js'

function buildApp(db: Database): Hono {
  const app = new Hono()
  app.route('/api/auth', createAuthRoutes(db))
  app.route('/api/campaigns', createCampaignRoutes(db))
  app.route('/api', createReqRoutes(db))
  return app
}

function extractCookie(res: Response, name: string): string | undefined {
  const header = res.headers.get('set-cookie')
  if (!header) return undefined
  const cookies = header.split(/,(?=[^;]+=[^;]*)/)
  for (const cookie of cookies) {
    const pair = cookie.trim().split(';')[0]
    const [key, value] = pair.split('=')
    if (key?.trim() === name) return value?.trim()
  }
  return undefined
}

async function setupAndLogin(app: Hono): Promise<string> {
  const res = await app.request('/api/auth/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password123' }),
  })
  return `dc_session=${extractCookie(res, 'dc_session')}`
}

async function createCampaign(app: Hono, cookie: string): Promise<string> {
  const res = await app.request('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: 'Test Campaign' }),
  })
  return ((await res.json()) as { id: string }).id
}

function insertTrooper(
  db: Database,
  campaignId: string,
  trooperId: string,
  data: Record<string, unknown>
): void {
  db.prepare<[string, string, string, string]>(
    'INSERT INTO troopers (id, campaign_id, data, created_at) VALUES (?, ?, ?, ?)'
  ).run(trooperId, campaignId, JSON.stringify(data), new Date().toISOString())
}

describe('PATCH /api/campaigns/:id/req', () => {
  let db: Database
  let app: Hono
  let cookie: string
  let campaignId: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    cookie = await setupAndLogin(app)
    campaignId = await createCampaign(app, cookie)
  })

  it('sets the REQ pool', async () => {
    const res = await app.request(`/api/campaigns/${campaignId}/req`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ req: 7 }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { req: number }
    expect(body.req).toBe(7)

    const stored = db
      .prepare<[string], { req: number }>('SELECT req FROM campaigns WHERE id = ?')
      .get(campaignId)!
    expect(stored.req).toBe(7)
  })

  it('rejects negative or non-integer values', async () => {
    const a = await app.request(`/api/campaigns/${campaignId}/req`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ req: -1 }),
    })
    expect(a.status).toBe(400)

    const b = await app.request(`/api/campaigns/${campaignId}/req`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ req: 1.5 }),
    })
    expect(b.status).toBe(400)
  })
})

describe('POST /api/campaigns/:id/req/spend', () => {
  let db: Database
  let app: Hono
  let cookie: string
  let campaignId: string
  const trooperId = 'trooper-1'

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    cookie = await setupAndLogin(app)
    campaignId = await createCampaign(app, cookie)
    insertTrooper(db, campaignId, trooperId, { id: trooperId, name: 'Pvt Jones', weapon: 'Carbine' })
    db.prepare<[string]>('UPDATE campaigns SET req = 5 WHERE id = ?').run(campaignId)
  })

  it('atomically spends REQ and updates trooper gear', async () => {
    const res = await app.request(`/api/campaigns/${campaignId}/req/spend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        amount: 2,
        trooperId,
        gearChange: { slot: 'weapon', name: 'Marksman Rifle' },
      }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { req: number; trooper: { data: { weapon: string } } }
    expect(body.req).toBe(3)
    expect(body.trooper.data.weapon).toBe('Marksman Rifle')

    const trooperRow = db
      .prepare<[string], { data: string }>('SELECT data FROM troopers WHERE id = ?')
      .get(trooperId)!
    const stored = JSON.parse(trooperRow.data) as { weapon: string }
    expect(stored.weapon).toBe('Marksman Rifle')
  })

  it('refuses to spend below 0', async () => {
    const res = await app.request(`/api/campaigns/${campaignId}/req/spend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        amount: 99,
        trooperId,
        gearChange: { slot: 'weapon', name: 'Sniper Rifle' },
      }),
    })
    expect(res.status).toBe(409)

    const stored = db
      .prepare<[string], { req: number }>('SELECT req FROM campaigns WHERE id = ?')
      .get(campaignId)!
    expect(stored.req).toBe(5)
  })

  it('returns 404 when trooper does not belong to campaign', async () => {
    const res = await app.request(`/api/campaigns/${campaignId}/req/spend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        amount: 1,
        trooperId: 'nope',
        gearChange: { slot: 'weapon', name: 'Carbine' },
      }),
    })
    expect(res.status).toBe(404)
  })
})
