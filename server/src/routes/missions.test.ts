import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'better-sqlite3'
import { Hono } from 'hono'
import { createTestDb } from '../db.js'
import { createAuthRoutes } from './auth.js'
import { createCampaignRoutes } from './campaigns.js'
import { createSquadRoutes } from './squads.js'
import { createMissionRoutes } from './missions.js'

function buildApp(db: Database): Hono {
  const app = new Hono()
  app.route('/api/auth', createAuthRoutes(db))
  app.route('/api/campaigns', createCampaignRoutes(db))
  app.route('/api', createSquadRoutes(db))
  app.route('/api', createMissionRoutes(db))
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

async function createSquad(app: Hono, cookie: string, campaignId: string): Promise<string> {
  const res = await app.request(`/api/campaigns/${campaignId}/squads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ data: { name: 'Alpha' } }),
  })
  return ((await res.json()) as { id: string }).id
}

async function createBlueprint(app: Hono, cookie: string, campaignId: string): Promise<string> {
  const res = await app.request(`/api/campaigns/${campaignId}/missions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      data: { name: 'Op Spear', sectors: [], status: 'blueprint' },
    }),
  })
  return ((await res.json()) as { id: string }).id
}

async function setReqEnabled(app: Hono, cookie: string, campaignId: string): Promise<void> {
  await app.request(`/api/campaigns/${campaignId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ reqEnabled: true }),
  })
}

describe('POST /api/campaigns/:id/missions', () => {
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

  it('creates a blueprint', async () => {
    const res = await app.request(`/api/campaigns/${campaignId}/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: { name: 'Op Spear', sectors: [] } }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { id: string; status: string; data: { name: string } }
    expect(body.status).toBe('blueprint')
    expect(body.data.name).toBe('Op Spear')
  })
})

describe('PATCH /api/missions/:id', () => {
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

  it('allows editing a blueprint', async () => {
    const id = await createBlueprint(app, cookie, campaignId)
    const res = await app.request(`/api/missions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: { name: 'Op Spear v2', sectors: [{ id: 's1' }] } }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { name: string; sectors: unknown[] } }
    expect(body.data.name).toBe('Op Spear v2')
    expect(body.data.sectors).toHaveLength(1)
  })

  it('rejects PATCH on a live mission', async () => {
    const id = await createBlueprint(app, cookie, campaignId)
    const squadId = await createSquad(app, cookie, campaignId)
    await app.request(`/api/missions/${id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ squadId }),
    })

    const res = await app.request(`/api/missions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: { name: 'edit attempt' } }),
    })
    expect(res.status).toBe(409)
  })
})

describe('POST /api/missions/:id/deploy', () => {
  let db: Database
  let app: Hono
  let cookie: string
  let campaignId: string
  let squadId: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    cookie = await setupAndLogin(app)
    campaignId = await createCampaign(app, cookie)
    squadId = await createSquad(app, cookie, campaignId)
  })

  it('transitions blueprint→live and sets currentMissionId', async () => {
    const id = await createBlueprint(app, cookie, campaignId)
    const res = await app.request(`/api/missions/${id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ squadId }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; data: { squadId: string } }
    expect(body.status).toBe('live')
    expect(body.data.squadId).toBe(squadId)

    const getRes = await app.request(`/api/campaigns/${campaignId}`, {
      headers: { Cookie: cookie },
    })
    const getBody = (await getRes.json()) as { campaign: { currentMissionId: string | null } }
    expect(getBody.campaign.currentMissionId).toBe(id)
  })

  it('rejects deploy without squadId', async () => {
    const id = await createBlueprint(app, cookie, campaignId)
    const res = await app.request(`/api/missions/${id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('rejects deploy of an already-live mission', async () => {
    const id = await createBlueprint(app, cookie, campaignId)
    await app.request(`/api/missions/${id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ squadId }),
    })
    const res = await app.request(`/api/missions/${id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ squadId }),
    })
    expect(res.status).toBe(409)
  })
})

describe('POST /api/missions/:id/complete', () => {
  let db: Database
  let app: Hono
  let cookie: string
  let campaignId: string
  let squadId: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    cookie = await setupAndLogin(app)
    campaignId = await createCampaign(app, cookie)
    squadId = await createSquad(app, cookie, campaignId)
  })

  it('transitions live→completed, nulls currentMissionId, awards REQ when enabled', async () => {
    await setReqEnabled(app, cookie, campaignId)

    const id = await createBlueprint(app, cookie, campaignId)
    await app.request(`/api/missions/${id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ squadId }),
    })

    const res = await app.request(`/api/missions/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ fieldReport: 'Squad held the line', outcome: 'victory', awardedReq: 3 }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      mission: { status: string; data: { fieldReport: string } }
      reqAwarded: number
      campaignReq: number
    }
    expect(body.mission.status).toBe('completed')
    expect(body.mission.data.fieldReport).toBe('Squad held the line')
    expect(body.reqAwarded).toBe(3)
    expect(body.campaignReq).toBe(3)

    const getRes = await app.request(`/api/campaigns/${campaignId}`, {
      headers: { Cookie: cookie },
    })
    const getBody = (await getRes.json()) as {
      campaign: { currentMissionId: string | null; req: number }
    }
    expect(getBody.campaign.currentMissionId).toBeNull()
    expect(getBody.campaign.req).toBe(3)
  })

  it('does not award REQ when disabled', async () => {
    const id = await createBlueprint(app, cookie, campaignId)
    await app.request(`/api/missions/${id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ squadId }),
    })

    const res = await app.request(`/api/missions/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ fieldReport: 'No REQ here', awardedReq: 5 }),
    })
    const body = (await res.json()) as { reqAwarded: number; campaignReq: number }
    expect(body.reqAwarded).toBe(0)
    expect(body.campaignReq).toBe(0)
  })
})

describe('PUT /api/missions/:id/state', () => {
  let db: Database
  let app: Hono
  let cookie: string
  let campaignId: string
  let squadId: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    cookie = await setupAndLogin(app)
    campaignId = await createCampaign(app, cookie)
    squadId = await createSquad(app, cookie, campaignId)
  })

  it('allows state PUT only on live missions', async () => {
    const id = await createBlueprint(app, cookie, campaignId)

    const blueprintPut = await app.request(`/api/missions/${id}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: { name: 'still blueprint' } }),
    })
    expect(blueprintPut.status).toBe(409)

    await app.request(`/api/missions/${id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ squadId }),
    })

    const livePut = await app.request(`/api/missions/${id}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: { name: 'updated', momentum: 2 } }),
    })
    expect(livePut.status).toBe(200)
  })
})

describe('DELETE /api/missions/:id', () => {
  let db: Database
  let app: Hono
  let cookie: string
  let campaignId: string
  let squadId: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    cookie = await setupAndLogin(app)
    campaignId = await createCampaign(app, cookie)
    squadId = await createSquad(app, cookie, campaignId)
  })

  it('deletes a blueprint', async () => {
    const id = await createBlueprint(app, cookie, campaignId)
    const res = await app.request(`/api/missions/${id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
  })

  it('refuses to delete a live mission', async () => {
    const id = await createBlueprint(app, cookie, campaignId)
    await app.request(`/api/missions/${id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ squadId }),
    })
    const res = await app.request(`/api/missions/${id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(409)
  })
})
