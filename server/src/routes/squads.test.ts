import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'better-sqlite3'
import { Hono } from 'hono'
import { createTestDb } from '../db.js'
import { createAuthRoutes } from './auth.js'
import { createCampaignRoutes } from './campaigns.js'
import { createSquadRoutes } from './squads.js'

function buildApp(db: Database): Hono {
  const app = new Hono()
  app.route('/api/auth', createAuthRoutes(db))
  app.route('/api/campaigns', createCampaignRoutes(db))
  app.route('/api', createSquadRoutes(db))
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
  const cookie = extractCookie(res, 'dc_session')
  return `dc_session=${cookie}`
}

async function createCampaign(app: Hono, cookie: string, name = 'Test Campaign'): Promise<string> {
  const res = await app.request('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name }),
  })
  const body = (await res.json()) as { id: string }
  return body.id
}

describe('POST /api/campaigns/:campaignId/squads', () => {
  let db: Database
  let app: Hono
  let sessionCookie: string
  let campaignId: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    sessionCookie = await setupAndLogin(app)
    campaignId = await createCampaign(app, sessionCookie)
  })

  it('creates a squad', async () => {
    const res = await app.request(`/api/campaigns/${campaignId}/squads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ data: { name: 'Bravo', sergeantId: null, perks: [], notes: '' } }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      id: string
      campaignId: string
      data: { name: string }
    }
    expect(body.id.length).toBeGreaterThan(0)
    expect(body.campaignId).toBe(campaignId)
    expect(body.data.name).toBe('Bravo')
  })

  it('rejects missing data', async () => {
    const res = await app.request(`/api/campaigns/${campaignId}/squads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 if campaign missing', async () => {
    const res = await app.request('/api/campaigns/nope/squads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ data: { name: 'X' } }),
    })
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/squads/:id', () => {
  let db: Database
  let app: Hono
  let sessionCookie: string
  let campaignId: string
  let squadId: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    sessionCookie = await setupAndLogin(app)
    campaignId = await createCampaign(app, sessionCookie)
    const res = await app.request(`/api/campaigns/${campaignId}/squads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ data: { name: 'Bravo', perks: [] } }),
    })
    const body = (await res.json()) as { id: string }
    squadId = body.id
  })

  it('replaces the squad data blob', async () => {
    const res = await app.request(`/api/squads/${squadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({
        data: { name: 'Bravo Renamed', sergeantId: 't1', perks: ['p1'], notes: 'updated' },
      }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { name: string; sergeantId: string; perks: string[]; notes: string }
    }
    expect(body.data.name).toBe('Bravo Renamed')
    expect(body.data.sergeantId).toBe('t1')
    expect(body.data.perks).toEqual(['p1'])
    expect(body.data.notes).toBe('updated')
  })

  it('404 on unknown squad', async () => {
    const res = await app.request('/api/squads/nope', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ data: { name: 'X' } }),
    })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/squads/:id', () => {
  let db: Database
  let app: Hono
  let sessionCookie: string
  let campaignId: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    sessionCookie = await setupAndLogin(app)
    campaignId = await createCampaign(app, sessionCookie)
  })

  it('deletes a squad', async () => {
    const createRes = await app.request(`/api/campaigns/${campaignId}/squads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ data: { name: 'Bravo' } }),
    })
    const { id } = (await createRes.json()) as { id: string }

    const delRes = await app.request(`/api/squads/${id}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    })
    expect(delRes.status).toBe(200)

    const delAgain = await app.request(`/api/squads/${id}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    })
    expect(delAgain.status).toBe(404)
  })

  it('cascades on campaign delete', async () => {
    const createRes = await app.request(`/api/campaigns/${campaignId}/squads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ data: { name: 'Bravo' } }),
    })
    const { id: squadId } = (await createRes.json()) as { id: string }

    await app.request(`/api/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    })

    const row = db
      .prepare<[string], { id: string }>('SELECT id FROM squads WHERE id = ?')
      .get(squadId)
    expect(row).toBeUndefined()
  })
})
