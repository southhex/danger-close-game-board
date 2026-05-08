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

  it('transitions live→completed, nulls currentMissionId, awards REQ per survivor when enabled', async () => {
    await setReqEnabled(app, cookie, campaignId)

    const id = await createBlueprint(app, cookie, campaignId)
    await app.request(`/api/missions/${id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ squadId }),
    })

    // Sync 2 surviving troopers in the deployed squad
    await app.request(`/api/campaigns/${campaignId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        troopers: [
          { id: 't1', squadId, status: 'ok', wasBleedingOut: false, grit: 3, grit_max: 3 },
          { id: 't2', squadId, status: 'wounded', wasBleedingOut: false, grit: 1, grit_max: 3 },
        ],
        diceHistory: [],
      }),
    })

    const res = await app.request(`/api/missions/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ fieldReport: 'Squad held the line', outcome: 'victory' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      mission: { status: string; data: { fieldReport: string; awardedReq: number } }
      reqAwarded: number
      campaignReq: number
      recoveringIds: string[]
    }
    expect(body.mission.status).toBe('completed')
    expect(body.mission.data.fieldReport).toBe('Squad held the line')
    expect(body.reqAwarded).toBe(2)   // 2 survivors
    expect(body.campaignReq).toBe(2)
    expect(body.recoveringIds).toContain('t2')  // ended Wounded → recovering
    expect(body.recoveringIds).not.toContain('t1')

    const getRes = await app.request(`/api/campaigns/${campaignId}`, {
      headers: { Cookie: cookie },
    })
    const getBody = (await getRes.json()) as {
      campaign: { currentMissionId: string | null; req: number }
    }
    expect(getBody.campaign.currentMissionId).toBeNull()
    expect(getBody.campaign.req).toBe(2)
  })

  it('does not award REQ when disabled', async () => {
    const id = await createBlueprint(app, cookie, campaignId)
    await app.request(`/api/missions/${id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ squadId }),
    })

    // Sync 1 trooper — but REQ disabled, so no award
    await app.request(`/api/campaigns/${campaignId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        troopers: [{ id: 't1', squadId, status: 'ok', wasBleedingOut: false }],
        diceHistory: [],
      }),
    })

    const res = await app.request(`/api/missions/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ fieldReport: 'No REQ here', outcome: 'defeat' }),
    })
    const body = (await res.json()) as { reqAwarded: number; campaignReq: number }
    expect(body.reqAwarded).toBe(0)
    expect(body.campaignReq).toBe(0)
  })

  it('flags wasBleedingOut troopers as recovering even if healed to wounded', async () => {
    const id = await createBlueprint(app, cookie, campaignId)
    await app.request(`/api/missions/${id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ squadId }),
    })

    await app.request(`/api/campaigns/${campaignId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        troopers: [
          { id: 't1', squadId, status: 'ok', wasBleedingOut: false },
          { id: 't2', squadId, status: 'wounded', wasBleedingOut: true },  // healed from bleedingout
          { id: 't3', squadId, status: 'dead', wasBleedingOut: false },
        ],
        diceHistory: [],
      }),
    })

    const res = await app.request(`/api/missions/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ outcome: 'victory' }),
    })
    const body = (await res.json()) as { recoveringIds: string[]; reqAwarded: number }
    expect(body.recoveringIds).toContain('t2')       // wasBleedingOut → recovering
    expect(body.recoveringIds).not.toContain('t1')   // ok, no flag
    expect(body.recoveringIds).not.toContain('t3')   // dead, not recovering
    expect(body.reqAwarded).toBe(0)                  // REQ disabled; dead not counted
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

describe('Full deploy → PUT state → complete cycle', () => {
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

  it('deploy → PUT state → GET campaign returns embedded state → complete clears currentMissionId', async () => {
    // 1. Create blueprint
    const missionId = await createBlueprint(app, cookie, campaignId)

    // 2. Deploy
    const deployRes = await app.request(`/api/missions/${missionId}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ squadId }),
    })
    expect(deployRes.status).toBe(200)
    const deployBody = (await deployRes.json()) as { status: string }
    expect(deployBody.status).toBe('live')

    // 3. Verify campaign currentMissionId is set
    const campaignRes1 = await app.request(`/api/campaigns/${campaignId}`, { headers: { Cookie: cookie } })
    const campaignBody1 = (await campaignRes1.json()) as { campaign: { currentMissionId: string | null } }
    expect(campaignBody1.campaign.currentMissionId).toBe(missionId)

    // 4. PUT mission state
    const missionState = { phase: 'advance', momentum: 1, sectors: [], advance_rolls: 2 }
    const putRes = await app.request(`/api/missions/${missionId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: { ...missionState, state: missionState } }),
    })
    expect(putRes.status).toBe(200)

    // 5. GET campaign — currentMission should include the state we PUT
    const campaignRes2 = await app.request(`/api/campaigns/${campaignId}`, { headers: { Cookie: cookie } })
    const campaignBody2 = (await campaignRes2.json()) as {
      campaign: { currentMissionId: string | null }
      currentMission: { id: string; status: string; data: Record<string, unknown> } | null
    }
    expect(campaignBody2.campaign.currentMissionId).toBe(missionId)
    expect(campaignBody2.currentMission).not.toBeNull()
    expect(campaignBody2.currentMission!.data['phase']).toBe('advance')
    expect(campaignBody2.currentMission!.data['momentum']).toBe(1)

    // 6. Complete the mission
    const completeRes = await app.request(`/api/missions/${missionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ fieldReport: 'test', outcome: 'victory' }),
    })
    expect(completeRes.status).toBe(200)
    const completeBody = (await completeRes.json()) as { mission: { status: string }; reqAwarded: number; campaignReq: number }
    expect(completeBody.mission.status).toBe('completed')
    expect(completeBody.reqAwarded).toBe(0) // req_enabled=0 by default

    // 7. Verify campaign currentMissionId is null
    const campaignRes3 = await app.request(`/api/campaigns/${campaignId}`, { headers: { Cookie: cookie } })
    const campaignBody3 = (await campaignRes3.json()) as { campaign: { currentMissionId: string | null } }
    expect(campaignBody3.campaign.currentMissionId).toBeNull()
  })

  it('awards REQ per survivor when req_enabled=1', async () => {
    await setReqEnabled(app, cookie, campaignId)
    const missionId = await createBlueprint(app, cookie, campaignId)
    await app.request(`/api/missions/${missionId}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ squadId }),
    })
    // Sync 3 survivors in the deployed squad
    await app.request(`/api/campaigns/${campaignId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        troopers: [
          { id: 'ta', squadId, status: 'ok', wasBleedingOut: false },
          { id: 'tb', squadId, status: 'wounded', wasBleedingOut: false },
          { id: 'tc', squadId, status: 'ok', wasBleedingOut: false },
        ],
        diceHistory: [],
      }),
    })
    const res = await app.request(`/api/missions/${missionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ fieldReport: 'done', outcome: 'victory' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { reqAwarded: number; campaignReq: number }
    expect(body.reqAwarded).toBe(3)  // 3 survivors
    expect(body.campaignReq).toBe(3)
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
