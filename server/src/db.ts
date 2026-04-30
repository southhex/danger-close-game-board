import Database from 'better-sqlite3'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function getDbPath(): string {
  if (process.env.NODE_ENV === 'production') {
    return process.env.DB_PATH ?? '/data/danger-close.db'
  }
  return process.env.DB_PATH ?? join(__dirname, '..', 'danger-close-dev.db')
}

export function createDb(path: string): Database.Database {
  const db = new Database(path)

  // Enable WAL mode and foreign keys
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Ensure migrations tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      filename   TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  runMigrations(db)

  return db
}

export function runMigrations(db: Database.Database): void {
  const migrationsDir = join(__dirname, 'migrations')

  let files: string[]
  try {
    files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    // No migrations directory — nothing to apply
    return
  }

  const applied = new Set(
    (
      db
        .prepare<[], { filename: string }>('SELECT filename FROM _migrations')
        .all()
    ).map((r) => r.filename)
  )

  for (const filename of files) {
    if (applied.has(filename)) continue

    const sql = readFileSync(join(migrationsDir, filename), 'utf8')

    db.transaction(() => {
      try {
        db.exec(sql)
      } catch (err) {
        throw new Error(`Migration failed: ${filename}`, { cause: err })
      }
      db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(filename)
    })()

    console.log(`[db] Applied migration: ${filename}`)
  }
}

let db: Database.Database
try {
  db = createDb(getDbPath())
} catch (err) {
  console.error('[db] Fatal: failed to initialise database:', err)
  process.exit(1)
}
export { db }

// Allow tests to create an isolated in-memory DB
export function createTestDb(): Database.Database {
  const testDb = new Database(':memory:')
  testDb.pragma('journal_mode = WAL')
  testDb.pragma('foreign_keys = ON')

  testDb.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      filename   TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  runMigrations(testDb)

  return testDb
}
