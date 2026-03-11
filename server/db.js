import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'app.sqlite')

export function openDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function initDb(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL CHECK(role IN ('admin','student','faculty')),
      identifier TEXT NOT NULL UNIQUE, -- email or idOrEmail (normalized lower)
      full_name TEXT,
      password_hash TEXT NOT NULL,
      twofa_enabled INTEGER NOT NULL DEFAULT 0,
      twofa_backup_code TEXT,
      twofa_secret TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      identifier TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `)

  // Apply schema migrations
  try {
    db.exec(`ALTER TABLE users ADD COLUMN twofa_secret TEXT;`);
  } catch (e) {
    // Ignore if column already exists
  }
}

