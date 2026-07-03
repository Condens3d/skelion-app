/**
 * SQLite store (node:sqlite) — local development fallback.
 * Async wrapper so it matches the Postgres store's contract exactly.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import bcrypt from 'bcryptjs';

export async function createSqliteStore(config, log) {
  const abs = resolve(config.sqlitePath || './data/skelion.db');
  mkdirSync(dirname(abs), { recursive: true });
  const db = new DatabaseSync(abs);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
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

  const q = {
    insertSub: db.prepare(`INSERT INTO submissions (name, organization, email, service, message, locale) VALUES (?, ?, ?, ?, ?, ?)`),
    listSub: db.prepare(`SELECT id, name, organization, email, service, message, locale, created_at, handled, handled_at FROM submissions ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`),
    countSub: db.prepare('SELECT COUNT(*) AS n FROM submissions'),
    setHandled: db.prepare(`UPDATE submissions SET handled = ?, handled_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END WHERE id = ?`),
    delSub: db.prepare('DELETE FROM submissions WHERE id = ?'),
    adminByEmail: db.prepare('SELECT id, email, password_hash FROM admin_users WHERE email = ?'),
    adminCount: db.prepare('SELECT COUNT(*) AS n FROM admin_users'),
    insertAdmin: db.prepare('INSERT INTO admin_users (email, password_hash) VALUES (?, ?)'),
  };

  return {
    driver: 'sqlite',
    async createSubmission(d) {
      const r = q.insertSub.run(d.name, d.organization, d.email, d.service, d.message, d.locale);
      return Number(r.lastInsertRowid);
    },
    async listSubmissions(limit, offset) {
      return { total: q.countSub.get().n, items: q.listSub.all(limit, offset) };
    },
    async setSubmissionHandled(id, handled) {
      const r = q.setHandled.run(handled ? 1 : 0, handled ? 1 : 0, id);
      return r.changes > 0;
    },
    async deleteSubmission(id) {
      return q.delSub.run(id).changes > 0;
    },
    async findAdminByEmail(email) {
      return q.adminByEmail.get(email.toLowerCase()) ?? null;
    },
    async seedAdmin(email, password) {
      if (q.adminCount.get().n > 0) return false;
      if (!email || !password) { log.warn?.('[seed] admin env not set; /admin unusable until seeded.'); return false; }
      if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
      q.insertAdmin.run(email.toLowerCase(), bcrypt.hashSync(password, 12));
      log.info?.(`[seed] admin created for ${email}`);
      return true;
    },
    async close() { db.close(); },
  };
}
