import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'better-sqlite3'
import { Hono } from 'hono'
import { createTestDb } from '../db.js'
import { createAuthRoutes } from './auth.js'
import { createCampaignRoutes } from './campaigns.js'

function buildApp(db: Database): Hono {
  const app = new Hono()
  app.route('/api/auth', createAuthRoutes(db))
  app.route('/api/campaigns', createCampaignRoutes(db))
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

describe('POST /api/campaigns', () => {
  let db: Database
  let app: Hono
  let sessionCookie: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    sessionCookie = await setupAndLogin(app)
  })

  it('creates a campaign and returns it', async () => {
    const res = await app.request('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ name: 'Operation Overload', description: 'A tough mission' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { id: string; name: string; description: string; created_at: string }
    expect(body.name).toBe('Operation Overload')
    expect(body.description).toBe('A tough mission')
    expect(typeof body.id).toBe('string')
    expect(body.id.length).toBeGreaterThan(0)
    expect(typeof body.created_at).toBe('string')
  })

  it('fails with 400 if name is empty', async () => {
    const res = await app.request('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ name: '' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/name/i)
  })
})

describe('GET /api/campaigns/:id', () => {
  let db: Database
  let app: Hono
  let sessionCookie: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    sessionCookie = await setupAndLogin(app)
  })

  it('returns full state (campaign + empty troopers + empty diceHistory)', async () => {
    const createRes = await app.request('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ name: 'Alpha Squad' }),
    })
    const { id } = await createRes.json() as { id: string }

    const res = await app.request(`/api/campaigns/${id}`, {
      headers: { Cookie: sessionCookie },
    })

    expect(res.status).toBe(200)
    const body = await res.json() as {
      campaign: { id: string; name: string; description: string; created_at: string }
      troopers: unknown[]
      diceHistory: unknown[]
    }
    expect(body.campaign.id).toBe(id)
    expect(body.campaign.name).toBe('Alpha Squad')
    expect(body.troopers).toEqual([])
    expect(body.diceHistory).toEqual([])
  })

  it('returns 404 for non-existent id', async () => {
    const res = await app.request('/api/campaigns/does-not-exist', {
      headers: { Cookie: sessionCookie },
    })

    expect(res.status).toBe(404)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Campaign not found')
  })
})

describe('PATCH /api/campaigns/:id', () => {
  let db: Database
  let app: Hono
  let sessionCookie: string
  let campaignId: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    sessionCookie = await setupAndLogin(app)

    const res = await app.request('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ name: 'Old Name', description: 'Old desc' }),
    })
    const body = await res.json() as { id: string }
    campaignId = body.id
  })

  it('renames a campaign', async () => {
    const res = await app.request(`/api/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ name: 'New Name' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { id: string; name: string; description: string }
    expect(body.name).toBe('New Name')
    expect(body.description).toBe('Old desc')
    expect(body.id).toBe(campaignId)
  })

  it('returns 400 if neither name nor description provided', async () => {
    const res = await app.request(`/api/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/name|description/i)
  })
})

describe('DELETE /api/campaigns/:id', () => {
  let db: Database
  let app: Hono
  let sessionCookie: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    sessionCookie = await setupAndLogin(app)
  })

  it('deletes campaign; subsequent GET returns 404', async () => {
    const createRes = await app.request('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ name: 'Doomed Campaign' }),
    })
    const { id } = await createRes.json() as { id: string }

    const deleteRes = await app.request(`/api/campaigns/${id}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    })
    expect(deleteRes.status).toBe(200)
    const deleteBody = await deleteRes.json() as { ok: boolean }
    expect(deleteBody.ok).toBe(true)

    const getRes = await app.request(`/api/campaigns/${id}`, {
      headers: { Cookie: sessionCookie },
    })
    expect(getRes.status).toBe(404)
  })
})

describe('PUT /api/campaigns/:id/state', () => {
  let db: Database
  let app: Hono
  let sessionCookie: string
  let campaignId: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    sessionCookie = await setupAndLogin(app)

    const res = await app.request('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ name: 'Test Campaign' }),
    })
    const body = await res.json() as { id: string }
    campaignId = body.id
  })

  it('stores troopers + diceHistory; GET returns them back', async () => {
    const trooper = { id: 'trooper-1', created_at: '2026-01-01T00:00:00.000Z', name: 'Sgt Miller', mobility: 3 }
    const diceRoll = { id: 1, result: 6, label: 'Attack' }

    const putRes = await app.request(`/api/campaigns/${campaignId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ troopers: [trooper], diceHistory: [diceRoll] }),
    })
    expect(putRes.status).toBe(200)
    const putBody = await putRes.json() as { ok: boolean }
    expect(putBody.ok).toBe(true)

    const getRes = await app.request(`/api/campaigns/${campaignId}`, {
      headers: { Cookie: sessionCookie },
    })
    expect(getRes.status).toBe(200)
    const getBody = await getRes.json() as {
      campaign: unknown
      troopers: unknown[]
      diceHistory: unknown[]
    }

    expect(getBody.troopers).toHaveLength(1)
    expect((getBody.troopers[0] as { name: string }).name).toBe('Sgt Miller')
    expect(getBody.diceHistory).toHaveLength(1)
    expect((getBody.diceHistory[0] as { result: number }).result).toBe(6)
  })

  it('replaces state (second PUT overwrites first)', async () => {
    const firstTrooper = { id: 'trooper-a', created_at: '2026-01-01T00:00:00.000Z', name: 'Pvt Jones' }
    await app.request(`/api/campaigns/${campaignId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ troopers: [firstTrooper], mission: null, diceHistory: [] }),
    })

    const secondTrooper = { id: 'trooper-b', created_at: '2026-01-02T00:00:00.000Z', name: 'Cpl Davis' }
    await app.request(`/api/campaigns/${campaignId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ troopers: [secondTrooper], mission: null, diceHistory: [] }),
    })

    const getRes = await app.request(`/api/campaigns/${campaignId}`, {
      headers: { Cookie: sessionCookie },
    })
    const body = await getRes.json() as { troopers: unknown[] }
    expect(body.troopers).toHaveLength(1)
    expect((body.troopers[0] as { name: string }).name).toBe('Cpl Davis')
  })

  it('caps diceHistory at 20 items', async () => {
    const rolls = Array.from({ length: 25 }, (_, i) => ({ id: i, result: i + 1, label: `roll-${i}` }))

    await app.request(`/api/campaigns/${campaignId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ troopers: [], mission: null, diceHistory: rolls }),
    })

    const getRes = await app.request(`/api/campaigns/${campaignId}`, {
      headers: { Cookie: sessionCookie },
    })
    const body = await getRes.json() as { diceHistory: unknown[] }
    expect(body.diceHistory).toHaveLength(20)
  })
})
