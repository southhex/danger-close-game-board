import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'better-sqlite3'
import { Hono } from 'hono'
import { createTestDb } from '../db.js'
import { createAuthRoutes } from './auth.js'
import { createCampaignRoutes } from './campaigns.js'
import { createBootstrapRoutes } from './bootstrap.js'

function buildApp(db: Database): Hono {
  const app = new Hono()
  app.route('/api/auth', createAuthRoutes(db))
  app.route('/api/campaigns', createCampaignRoutes(db))
  app.route('/api/bootstrap', createBootstrapRoutes(db))
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

describe('GET /api/bootstrap', () => {
  let db: Database
  let app: Hono
  let sessionCookie: string

  beforeEach(async () => {
    db = createTestDb()
    app = buildApp(db)
    sessionCookie = await setupAndLogin(app)
  })

  it('returns user info and campaign list', async () => {
    // Create a campaign first
    await app.request('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ name: 'My Campaign', description: 'Test' }),
    })

    const res = await app.request('/api/bootstrap', {
      headers: { Cookie: sessionCookie },
    })

    expect(res.status).toBe(200)
    const body = await res.json() as {
      user: { username: string }
      campaigns: Array<{ id: string; name: string; description: string; created_at: string }>
    }

    expect(body.user.username).toBe('admin')
    expect(body.campaigns).toHaveLength(1)
    expect(body.campaigns[0].name).toBe('My Campaign')
    expect(typeof body.campaigns[0].id).toBe('string')
    expect(typeof body.campaigns[0].created_at).toBe('string')
  })

  it('campaigns list is empty when no campaigns exist', async () => {
    const res = await app.request('/api/bootstrap', {
      headers: { Cookie: sessionCookie },
    })

    expect(res.status).toBe(200)
    const body = await res.json() as {
      user: { username: string }
      campaigns: unknown[]
    }

    expect(body.user.username).toBe('admin')
    expect(body.campaigns).toEqual([])
  })

  it('returns 401 without auth cookie', async () => {
    const res = await app.request('/api/bootstrap')

    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Unauthorized')
  })
})
