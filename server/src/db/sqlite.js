/**
 * SQLite store (node:sqlite) — local development fallback.
 * Async wrapper matching the Postgres store's contract exactly.
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
      name TEXT NOT NULL, organization TEXT DEFAULT '', email TEXT NOT NULL,
      service TEXT DEFAULT '', message TEXT DEFAULT '', locale TEXT DEFAULT 'en',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      handled INTEGER NOT NULL DEFAULT 0, handled_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at DESC);
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      tag TEXT DEFAULT '',
      title_en TEXT NOT NULL DEFAULT '', title_fr TEXT NOT NULL DEFAULT '',
      excerpt_en TEXT NOT NULL DEFAULT '', excerpt_fr TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '', body_fr TEXT NOT NULL DEFAULT '',
      published INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      published_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_posts_pub ON posts(published, published_at DESC);
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS client_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      last_login TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS engagements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'pentest',
      status TEXT NOT NULL DEFAULT 'scoping',
      summary TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS findings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      engagement_id INTEGER NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      cvss REAL,
      status TEXT NOT NULL DEFAULT 'open',
      description TEXT NOT NULL DEFAULT '',
      impact TEXT NOT NULL DEFAULT '',
      remediation TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      resolved_at TEXT
    );
    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT '', organization TEXT DEFAULT '', email TEXT DEFAULT '',
      answers TEXT NOT NULL, domain_scores TEXT NOT NULL,
      total_score INTEGER NOT NULL, grade TEXT NOT NULL,
      locale TEXT NOT NULL DEFAULT 'en',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE,
      locale TEXT DEFAULT 'en', created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const q = {
    insertSub: db.prepare(`INSERT INTO submissions (name, organization, email, service, message, locale) VALUES (?,?,?,?,?,?)`),
    listSub: db.prepare(`SELECT id,name,organization,email,service,message,locale,created_at,handled,handled_at FROM submissions ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`),
    countSub: db.prepare('SELECT COUNT(*) AS n FROM submissions'),
    countSubNew: db.prepare('SELECT COUNT(*) AS n FROM submissions WHERE handled = 0'),
    setHandled: db.prepare(`UPDATE submissions SET handled=?, handled_at=CASE WHEN ?=1 THEN datetime('now') ELSE NULL END WHERE id=?`),
    delSub: db.prepare('DELETE FROM submissions WHERE id=?'),
    adminByEmail: db.prepare('SELECT id,email,password_hash FROM admin_users WHERE email=?'),
    adminCount: db.prepare('SELECT COUNT(*) AS n FROM admin_users'),
    insertAdmin: db.prepare('INSERT INTO admin_users (email,password_hash) VALUES (?,?)'),
    // posts
    insertPost: db.prepare(`INSERT INTO posts (slug,tag,title_en,title_fr,excerpt_en,excerpt_fr,body_en,body_fr,published,published_at) VALUES (?,?,?,?,?,?,?,?,?,?)`),
    updatePost: db.prepare(`UPDATE posts SET slug=?,tag=?,title_en=?,title_fr=?,excerpt_en=?,excerpt_fr=?,body_en=?,body_fr=?,published=?, published_at=CASE WHEN ?=1 AND published_at IS NULL THEN datetime('now') WHEN ?=0 THEN NULL ELSE published_at END, updated_at=datetime('now') WHERE id=?`),
    delPost: db.prepare('DELETE FROM posts WHERE id=?'),
    postById: db.prepare('SELECT * FROM posts WHERE id=?'),
    postBySlugPub: db.prepare('SELECT * FROM posts WHERE slug=? AND published=1'),
    listPub: db.prepare('SELECT id,slug,tag,title_en,title_fr,excerpt_en,excerpt_fr,published_at FROM posts WHERE published=1 ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?'),
    countPub: db.prepare('SELECT COUNT(*) AS n FROM posts WHERE published=1'),
    listAll: db.prepare('SELECT id,slug,tag,title_en,title_fr,published,created_at,updated_at,published_at FROM posts ORDER BY updated_at DESC, id DESC'),
    countAllPosts: db.prepare('SELECT COUNT(*) AS n FROM posts'),
    // subscribers
    insClient: db.prepare('INSERT INTO clients (name) VALUES (?)'),
    listClients: db.prepare(`SELECT c.id, c.name, c.created_at,
        (SELECT COUNT(*) FROM client_users u WHERE u.client_id=c.id) users,
        (SELECT COUNT(*) FROM engagements e WHERE e.client_id=c.id) engagements
      FROM clients c ORDER BY c.name`),
    delClient: db.prepare('DELETE FROM clients WHERE id=?'),
    insCU: db.prepare('INSERT INTO client_users (client_id,email,name,password_hash) VALUES (?,?,?,?)'),
    cuByEmail: db.prepare('SELECT * FROM client_users WHERE email=?'),
    listCU: db.prepare('SELECT id,client_id,email,name,last_login,created_at FROM client_users WHERE client_id=? ORDER BY email'),
    delCU: db.prepare('DELETE FROM client_users WHERE id=?'),
    setCUPass: db.prepare('UPDATE client_users SET password_hash=? WHERE id=?'),
    touchCU: db.prepare(`UPDATE client_users SET last_login=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?`),
    insEng: db.prepare('INSERT INTO engagements (client_id,title,type,status,summary,start_date,end_date) VALUES (?,?,?,?,?,?,?)'),
    updEng: db.prepare(`UPDATE engagements SET title=?,type=?,status=?,summary=?,start_date=?,end_date=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?`),
    delEng: db.prepare('DELETE FROM engagements WHERE id=?'),
    engById: db.prepare('SELECT * FROM engagements WHERE id=?'),
    engsByClient: db.prepare('SELECT * FROM engagements WHERE client_id=? ORDER BY created_at DESC'),
    insFind: db.prepare('INSERT INTO findings (engagement_id,title,severity,cvss,status,description,impact,remediation) VALUES (?,?,?,?,?,?,?,?)'),
    updFind: db.prepare(`UPDATE findings SET title=?,severity=?,cvss=?,status=?,description=?,impact=?,remediation=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),resolved_at=CASE WHEN ? IN ('resolved','closed') AND resolved_at IS NULL THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') WHEN ? NOT IN ('resolved','closed') THEN NULL ELSE resolved_at END WHERE id=?`),
    delFind: db.prepare('DELETE FROM findings WHERE id=?'),
    findById: db.prepare('SELECT * FROM findings WHERE id=?'),
    findsByEng: db.prepare(`SELECT * FROM findings WHERE engagement_id=? ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, id`),
    insertAssessment: db.prepare(`INSERT INTO assessments (name,organization,email,answers,domain_scores,total_score,grade,locale) VALUES (?,?,?,?,?,?,?,?)`),
    listAssessments: db.prepare(`SELECT id,name,organization,email,domain_scores,total_score,grade,locale,created_at FROM assessments ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`),
    countAssessments: db.prepare('SELECT COUNT(*) n FROM assessments'),
    assessmentById: db.prepare('SELECT * FROM assessments WHERE id=?'),
    delAssessment: db.prepare('DELETE FROM assessments WHERE id=?'),
    avgAssessment: db.prepare('SELECT AVG(total_score) a FROM assessments'),
    tlSub: db.prepare(`SELECT date(created_at) d, COUNT(*) n FROM submissions WHERE created_at >= date('now', ?) GROUP BY date(created_at)`),
    tlAss: db.prepare(`SELECT date(created_at) d, COUNT(*) n FROM assessments WHERE created_at >= date('now', ?) GROUP BY date(created_at)`),
    insertSubscriber: db.prepare('INSERT OR IGNORE INTO subscribers (email,locale) VALUES (?,?)'),
    listSubscribers: db.prepare('SELECT id,email,locale,created_at FROM subscribers ORDER BY created_at DESC, id DESC'),
    countSubscribers: db.prepare('SELECT COUNT(*) AS n FROM subscribers'),
    delSubscriber: db.prepare('DELETE FROM subscribers WHERE id=?'),
  };

  return {
    driver: 'sqlite',
    // submissions
    async createSubmission(d) { return Number(q.insertSub.run(d.name,d.organization,d.email,d.service,d.message,d.locale).lastInsertRowid); },
    async listSubmissions(limit, offset) { return { total: q.countSub.get().n, items: q.listSub.all(limit, offset) }; },
    async setSubmissionHandled(id, h) { return q.setHandled.run(h?1:0,h?1:0,id).changes > 0; },
    async deleteSubmission(id) { return q.delSub.run(id).changes > 0; },
    // admin
    async findAdminByEmail(email) { return q.adminByEmail.get(email.toLowerCase()) ?? null; },
    async seedAdmin(email, password) {
      if (q.adminCount.get().n > 0) return false;
      if (!email || !password) { log.warn?.('[seed] admin env not set; /admin unusable until seeded.'); return false; }
      if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
      q.insertAdmin.run(email.toLowerCase(), bcrypt.hashSync(password, 12));
      log.info?.(`[seed] admin created for ${email}`);
      return true;
    },
    // posts
    async createPost(p) { return Number(q.insertPost.run(p.slug,p.tag,p.title_en,p.title_fr,p.excerpt_en,p.excerpt_fr,p.body_en,p.body_fr,p.published?1:0, p.published?new Date().toISOString():null).lastInsertRowid); },
    async updatePost(id, p) { const pub = p.published?1:0; return q.updatePost.run(p.slug,p.tag,p.title_en,p.title_fr,p.excerpt_en,p.excerpt_fr,p.body_en,p.body_fr,pub,pub,pub,id).changes > 0; },
    async deletePost(id) { return q.delPost.run(id).changes > 0; },
    async getPostById(id) { return q.postById.get(id) ?? null; },
    async getPublishedPostBySlug(slug) { return q.postBySlugPub.get(slug) ?? null; },
    async listPublishedPosts(limit, offset) { return { total: q.countPub.get().n, items: q.listPub.all(limit, offset) }; },
    async listAllPosts() { return { total: q.countAllPosts.get().n, items: q.listAll.all() }; },
    // subscribers
    // ---- client portal ----
    async createClient(name) { return Number(q.insClient.run(name).lastInsertRowid); },
    async listClients() { return q.listClients.all(); },
    async deleteClient(id) { return q.delClient.run(id).changes > 0; },
    async createClientUser(u) { return Number(q.insCU.run(u.client_id, u.email.toLowerCase(), u.name, u.password_hash).lastInsertRowid); },
    async findClientUserByEmail(email) { return q.cuByEmail.get(email.toLowerCase()) ?? null; },
    async listClientUsers(clientId) { return q.listCU.all(clientId); },
    async deleteClientUser(id) { return q.delCU.run(id).changes > 0; },
    async setClientUserPassword(id, hash) { return q.setCUPass.run(hash, id).changes > 0; },
    async touchClientLogin(id) { q.touchCU.run(id); },
    async createEngagement(e) { return Number(q.insEng.run(e.client_id,e.title,e.type,e.status,e.summary,e.start_date,e.end_date).lastInsertRowid); },
    async updateEngagement(id, e) { return q.updEng.run(e.title,e.type,e.status,e.summary,e.start_date,e.end_date,id).changes > 0; },
    async deleteEngagement(id) { return q.delEng.run(id).changes > 0; },
    async getEngagement(id) { return q.engById.get(id) ?? null; },
    async listEngagementsByClient(clientId) { return q.engsByClient.all(clientId); },
    async createFinding(f) { return Number(q.insFind.run(f.engagement_id,f.title,f.severity,f.cvss ?? null,f.status,f.description,f.impact,f.remediation).lastInsertRowid); },
    async updateFinding(id, f) { return q.updFind.run(f.title,f.severity,f.cvss ?? null,f.status,f.description,f.impact,f.remediation,f.status,f.status,id).changes > 0; },
    async deleteFinding(id) { return q.delFind.run(id).changes > 0; },
    async getFinding(id) { return q.findById.get(id) ?? null; },
    async listFindingsByEngagement(engId) { return q.findsByEng.all(engId); },
    // ---- assessments ----
    async createAssessment(a) { return Number(q.insertAssessment.run(a.name,a.organization,a.email,JSON.stringify(a.answers),JSON.stringify(a.domain_scores),a.total_score,a.grade,a.locale).lastInsertRowid); },
    async listAssessments(limit, offset) {
      const items = q.listAssessments.all(limit, offset).map(r => ({ ...r, domain_scores: JSON.parse(r.domain_scores) }));
      return { total: q.countAssessments.get().n, items };
    },
    async getAssessment(id) {
      const r = q.assessmentById.get(id); if (!r) return null;
      return { ...r, answers: JSON.parse(r.answers), domain_scores: JSON.parse(r.domain_scores) };
    },
    async deleteAssessment(id) { return q.delAssessment.run(id).changes > 0; },
    async timeline(days) {
      const arg = `-${days} days`;
      const sub = Object.fromEntries(q.tlSub.all(arg).map(r => [r.d, r.n]));
      const ass = Object.fromEntries(q.tlAss.all(arg).map(r => [r.d, r.n]));
      const out = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        out.push({ day: d, submissions: sub[d] || 0, assessments: ass[d] || 0 });
      }
      return out;
    },
    async addSubscriber(email, locale) { return q.insertSubscriber.run(email.toLowerCase(), locale).changes > 0; },
    async listSubscribers() { return { total: q.countSubscribers.get().n, items: q.listSubscribers.all() }; },
    async deleteSubscriber(id) { return q.delSubscriber.run(id).changes > 0; },
    // dashboard
    async statsExtra() {
      return { assessments: q.countAssessments.get().n, avgScore: Math.round((q.avgAssessment.get().a || 0) * 10) / 10 };
    },
    async stats() {
      return {
        submissions: q.countSub.get().n,
        submissionsNew: q.countSubNew.get().n,
        posts: q.countAllPosts.get().n,
        postsPublished: q.countPub.get().n,
        subscribers: q.countSubscribers.get().n,
      };
    },
    async close() { db.close(); },
  };
}
