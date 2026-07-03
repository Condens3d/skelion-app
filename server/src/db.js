import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import bcrypt from 'bcryptjs';

export function openDb(dbPath) {
  const abs = resolve(dbPath);
  mkdirSync(dirname(abs), { recursive: true });
  const db = new DatabaseSync(abs);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organization TEXT DEFAULT '',
      email TEXT NOT NULL,
      service TEXT DEFAULT '',
      message TEXT DEFAULT '',
      locale TEXT DEFAULT 'en',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      handled INTEGER NOT NULL DEFAULT 0,
      handled_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at DESC);
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

/** Seeds the first admin from env vars if no admin exists yet. */
export function seedAdmin(db, email, password, log = console) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM admin_users').get().n;
  if (count > 0) return false;
  if (!email || !password) {
    log.warn('[seed] No admin user exists and ADMIN_EMAIL/ADMIN_PASSWORD are not set. /admin will be unusable until seeded.');
    return false;
  }
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  }
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO admin_users (email, password_hash) VALUES (?, ?)').run(email.toLowerCase(), hash);
  log.info(`[seed] Admin account created for ${email}`);
  return true;
}
