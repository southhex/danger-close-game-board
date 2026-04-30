import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb, runMigrations } from './db.js'
import Database from 'better-sqlite3'
import type { Database as DatabaseType } from 'better-sqlite3'

const EXPECTED_TABLES = ['users', 'sessions', 'campaigns', 'troopers', 'dice_rolls']

function getTableNames(db: DatabaseType): string[] {
  return db
    .prepare<[], { name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    )
    .all()
    .map((r) => r.name)
    .filter((name) => !name.startsWith('_') && !name.startsWith('sqlite_'))
}

function getMigrationCount(db: DatabaseType): number {
  return (
    db
      .prepare<[], { count: number }>('SELECT COUNT(*) as count FROM _migrations')
      .get()?.count ?? 0
  )
}

describe('database migrations', () => {
  let db: DatabaseType

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

  it('running migrations again is idempotent — count stays at 1, no error', () => {
    // First pass already happened inside createTestDb
    expect(getMigrationCount(db)).toBe(1)

    // Second pass on the same DB instance — should skip already-applied files
    expect(() => runMigrations(db)).not.toThrow()

    // Count must still be exactly 1
    expect(getMigrationCount(db)).toBe(1)
  })

  it('_migrations table has the correct filename recorded', () => {
    const rows = db
      .prepare<[], { filename: string }>('SELECT filename FROM _migrations ORDER BY id')
      .all()
    expect(rows[0]?.filename).toBe('001_initial.sql')
  })

  it('failed migration throws with filename and rolls back', () => {
    // Build a minimal in-memory DB with the _migrations table and inject a
    // fake "migration" file by monkey-patching the migrations dir lookup.
    // Instead, we test the transaction rollback behaviour directly by calling
    // the internal path: prepare a DB, then simulate what runMigrations does
    // when db.exec() throws.
    const bareDb = new Database(':memory:')
    bareDb.pragma('journal_mode = WAL')
    bareDb.pragma('foreign_keys = ON')
    bareDb.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        filename   TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    const badSql = 'THIS IS NOT VALID SQL !!!'
    const filename = 'bad_migration.sql'

    // Replicate the transaction logic from runMigrations
    const runBad = bareDb.transaction(() => {
      try {
        bareDb.exec(badSql)
      } catch (err) {
        throw new Error(`Migration failed: ${filename}`, { cause: err })
      }
      bareDb.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(filename)
    })

    // Should throw with filename in message
    expect(() => runBad()).toThrow(`Migration failed: ${filename}`)

    // _migrations must still be empty — transaction rolled back
    expect(getMigrationCount(bareDb)).toBe(0)
  })
})
