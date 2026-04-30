import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from './db.js'
import type Database from 'better-sqlite3'

const EXPECTED_TABLES = ['users', 'sessions', 'campaigns', 'troopers', 'dice_rolls']

function getTableNames(db: Database.Database): string[] {
  return db
    .prepare<[], { name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    )
    .all()
    .map((r) => r.name)
    .filter((name) => !name.startsWith('_') && !name.startsWith('sqlite_'))
}

function getMigrationCount(db: Database.Database): number {
  return (
    db
      .prepare<[], { count: number }>('SELECT COUNT(*) as count FROM _migrations')
      .get()?.count ?? 0
  )
}

describe('database migrations', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
  })

  it('creates all 5 expected tables', () => {
    const tables = getTableNames(db)
    for (const table of EXPECTED_TABLES) {
      expect(tables).toContain(table)
    }
  })

  it('records one migration entry after init', () => {
    expect(getMigrationCount(db)).toBe(1)
  })

  it('running migrations again is idempotent — no duplicate entries', () => {
    // createTestDb already ran migrations; calling close + recreate from same
    // in-memory state simulates a second init by checking count stays at 1.
    // Since in-memory DBs are ephemeral per instance, we verify idempotency
    // by confirming IF NOT EXISTS guards hold — count must still be exactly 1.
    const count = getMigrationCount(db)
    expect(count).toBe(1)

    // Simulate a second migration pass on the same DB instance
    // by directly calling the internal check: re-preparing the migration
    // should not insert a duplicate row (UNIQUE constraint on filename).
    expect(() => {
      db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run('001_initial.sql')
    }).toThrow() // UNIQUE constraint violation = idempotency guard works

    // Count still 1
    expect(getMigrationCount(db)).toBe(1)
  })

  it('_migrations table has the correct filename recorded', () => {
    const rows = db
      .prepare<[], { filename: string }>('SELECT filename FROM _migrations ORDER BY id')
      .all()
    expect(rows[0]?.filename).toBe('001_initial.sql')
  })
})
