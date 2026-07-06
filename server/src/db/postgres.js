/**
 * PostgreSQL store — production. Parameterized queries throughout.
 * TLS enforced unless PGSSL=disable. Pool-based for horizontal scale.
 */
import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;

export async function createPostgresStore(config, log) {
  const ssl = process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: process.env.PGSSL_NO_VERIFY !== '1' };
  const pool = new Pool({
    connectionString: config.databaseUrl, ssl,
    max: Number(process.env.PGPOOL_MAX || 10), idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000,
  });
  pool.on('error', (err) => log.error?.('[pg] idle client error', err.message));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, organization TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL, service TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '',
      locale TEXT NOT NULL DEFAULT 'en', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      handled BOOLEAN NOT NULL DEFAULT false, handled_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions (created_at DESC);
    CREATE TABLE IF NOT EXISTS admin_users (
      id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      mfa_secret TEXT, mfa_enabled BOOLEAN NOT NULL DEFAULT false, recovery_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS posts (
      id BIGSERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, tag TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL DEFAULT '', title_fr TEXT NOT NULL DEFAULT '',
      excerpt_en TEXT NOT NULL DEFAULT '', excerpt_fr TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '', body_fr TEXT NOT NULL DEFAULT '',
      published BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      published_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_posts_pub ON posts (published, published_at DESC);
    CREATE TABLE IF NOT EXISTS clients (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS client_users (
      id BIGSERIAL PRIMARY KEY,
      client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      last_login TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS engagements (
      id BIGSERIAL PRIMARY KEY,
      client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'pentest',
      status TEXT NOT NULL DEFAULT 'scoping',
      summary TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS findings (
      id BIGSERIAL PRIMARY KEY,
      engagement_id BIGINT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      cvss REAL,
      status TEXT NOT NULL DEFAULT 'open',
      description TEXT NOT NULL DEFAULT '',
      impact TEXT NOT NULL DEFAULT '',
      remediation TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS compliance_status (
      id BIGSERIAL PRIMARY KEY,
      client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      control_id TEXT NOT NULL,
      maturity TEXT NOT NULL DEFAULT 'not_implemented',
      evidence TEXT NOT NULL DEFAULT '',
      owner TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(client_id, control_id)
    );
    CREATE TABLE IF NOT EXISTS assessments (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '', organization TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
      answers JSONB NOT NULL, domain_scores JSONB NOT NULL,
      total_score INTEGER NOT NULL, grade TEXT NOT NULL,
      locale TEXT NOT NULL DEFAULT 'en',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS subscribers (
      id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, locale TEXT NOT NULL DEFAULT 'en',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const iso = (v) => (v instanceof Date ? v.toISOString() : v);
  const mapSub = (r) => ({ ...r, id: Number(r.id), created_at: iso(r.created_at), handled: r.handled ? 1 : 0, handled_at: iso(r.handled_at) });
  const mapPostFull = (r) => ({ ...r, id: Number(r.id), published: r.published ? 1 : 0, created_at: iso(r.created_at), updated_at: iso(r.updated_at), published_at: iso(r.published_at) });

  return {
    driver: 'postgres',
    async createSubmission(d) {
      const r = await pool.query(`INSERT INTO submissions (name,organization,email,service,message,locale) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [d.name,d.organization,d.email,d.service,d.message,d.locale]);
      return Number(r.rows[0].id);
    },
    async listSubmissions(limit, offset) {
      const [items, total] = await Promise.all([
        pool.query(`SELECT id,name,organization,email,service,message,locale,created_at,handled,handled_at FROM submissions ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2`, [limit, offset]),
        pool.query('SELECT COUNT(*)::int AS n FROM submissions'),
      ]);
      return { total: total.rows[0].n, items: items.rows.map(mapSub) };
    },
    async setSubmissionHandled(id, h) {
      const r = await pool.query(`UPDATE submissions SET handled=$1, handled_at=CASE WHEN $1 THEN now() ELSE NULL END WHERE id=$2`, [h, id]);
      return r.rowCount > 0;
    },
    async deleteSubmission(id) { return (await pool.query('DELETE FROM submissions WHERE id=$1', [id])).rowCount > 0; },
    async countAdmins() { const r = await pool.query('SELECT COUNT(*)::int AS n FROM admin_users'); return r.rows[0].n; },
    async findAdminByEmail(email) {
      const r = await pool.query('SELECT id,email,password_hash,mfa_secret,mfa_enabled,recovery_codes FROM admin_users WHERE email=$1', [email.toLowerCase()]);
      return r.rows[0] ?? null;
    },
    async findAdminById(id) {
      const r = await pool.query('SELECT id,email,password_hash,mfa_secret,mfa_enabled,recovery_codes FROM admin_users WHERE id=$1', [id]);
      return r.rows[0] ?? null;
    },
    async setAdminMfaSecret(id, secret) { return (await pool.query('UPDATE admin_users SET mfa_secret=$1 WHERE id=$2', [secret, id])).rowCount > 0; },
    async enableAdminMfa(id, recoveryHashes) { return (await pool.query('UPDATE admin_users SET mfa_enabled=true, recovery_codes=$1 WHERE id=$2', [JSON.stringify(recoveryHashes), id])).rowCount > 0; },
    async disableAdminMfa(id) { return (await pool.query("UPDATE admin_users SET mfa_enabled=false, mfa_secret=NULL, recovery_codes='[]'::jsonb WHERE id=$1", [id])).rowCount > 0; },
    async setAdminRecoveryCodes(id, recoveryHashes) { return (await pool.query('UPDATE admin_users SET recovery_codes=$1 WHERE id=$2', [JSON.stringify(recoveryHashes), id])).rowCount > 0; },
    async seedAdmin(email, password) {
      const c = await pool.query('SELECT COUNT(*)::int AS n FROM admin_users');
      if (c.rows[0].n > 0) return false;
      if (!email || !password) { log.warn?.('[seed] admin env not set; /admin unusable until seeded.'); return false; }
      if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
      await pool.query('INSERT INTO admin_users (email,password_hash) VALUES ($1,$2)', [email.toLowerCase(), bcrypt.hashSync(password, 12)]);
      log.info?.(`[seed] admin created for ${email}`);
      return true;
    },
    async createPost(p) {
      const r = await pool.query(`INSERT INTO posts (slug,tag,title_en,title_fr,excerpt_en,excerpt_fr,body_en,body_fr,published,published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [p.slug,p.tag,p.title_en,p.title_fr,p.excerpt_en,p.excerpt_fr,p.body_en,p.body_fr,p.published, p.published ? new Date() : null]);
      return Number(r.rows[0].id);
    },
    async updatePost(id, p) {
      const r = await pool.query(`UPDATE posts SET slug=$1,tag=$2,title_en=$3,title_fr=$4,excerpt_en=$5,excerpt_fr=$6,body_en=$7,body_fr=$8,published=$9,
        published_at=CASE WHEN $9 AND published_at IS NULL THEN now() WHEN NOT $9 THEN NULL ELSE published_at END, updated_at=now() WHERE id=$10`,
        [p.slug,p.tag,p.title_en,p.title_fr,p.excerpt_en,p.excerpt_fr,p.body_en,p.body_fr,p.published,id]);
      return r.rowCount > 0;
    },
    async deletePost(id) { return (await pool.query('DELETE FROM posts WHERE id=$1', [id])).rowCount > 0; },
    async getPostById(id) { const r = await pool.query('SELECT * FROM posts WHERE id=$1', [id]); return r.rows[0] ? mapPostFull(r.rows[0]) : null; },
    async getPublishedPostBySlug(slug) { const r = await pool.query('SELECT * FROM posts WHERE slug=$1 AND published=true', [slug]); return r.rows[0] ? mapPostFull(r.rows[0]) : null; },
    async listPublishedPosts(limit, offset) {
      const [items, total] = await Promise.all([
        pool.query('SELECT id,slug,tag,title_en,title_fr,excerpt_en,excerpt_fr,published_at FROM posts WHERE published=true ORDER BY published_at DESC, id DESC LIMIT $1 OFFSET $2', [limit, offset]),
        pool.query('SELECT COUNT(*)::int AS n FROM posts WHERE published=true'),
      ]);
      return { total: total.rows[0].n, items: items.rows.map((r) => ({ ...r, id: Number(r.id), published_at: iso(r.published_at) })) };
    },
    async listAllPosts() {
      const [items, total] = await Promise.all([
        pool.query('SELECT id,slug,tag,title_en,title_fr,published,created_at,updated_at,published_at FROM posts ORDER BY updated_at DESC, id DESC'),
        pool.query('SELECT COUNT(*)::int AS n FROM posts'),
      ]);
      return { total: total.rows[0].n, items: items.rows.map(mapPostFull) };
    },
    // ---- client portal ----
    async createClient(name) {
      const r = await pool.query('INSERT INTO clients (name) VALUES ($1) RETURNING id', [name]);
      return Number(r.rows[0].id);
    },
    async listClients() {
      const r = await pool.query(`SELECT c.id, c.name, c.created_at,
          (SELECT COUNT(*)::int FROM client_users u WHERE u.client_id=c.id) users,
          (SELECT COUNT(*)::int FROM engagements e WHERE e.client_id=c.id) engagements
        FROM clients c ORDER BY c.name`);
      return r.rows;
    },
    async deleteClient(id) { return (await pool.query('DELETE FROM clients WHERE id=$1', [id])).rowCount > 0; },
    async createClientUser(u) {
      const r = await pool.query('INSERT INTO client_users (client_id,email,name,password_hash) VALUES ($1,$2,$3,$4) RETURNING id',
        [u.client_id, u.email.toLowerCase(), u.name, u.password_hash]);
      return Number(r.rows[0].id);
    },
    async findClientUserByEmail(email) {
      const r = await pool.query('SELECT * FROM client_users WHERE email=$1', [email.toLowerCase()]);
      return r.rows[0] ?? null;
    },
    async listClientUsers(clientId) {
      const r = await pool.query('SELECT id,client_id,email,name,last_login,created_at FROM client_users WHERE client_id=$1 ORDER BY email', [clientId]);
      return r.rows;
    },
    async deleteClientUser(id) { return (await pool.query('DELETE FROM client_users WHERE id=$1', [id])).rowCount > 0; },
    async setClientUserPassword(id, hash) { return (await pool.query('UPDATE client_users SET password_hash=$1 WHERE id=$2', [hash, id])).rowCount > 0; },
    async touchClientLogin(id) { await pool.query('UPDATE client_users SET last_login=now() WHERE id=$1', [id]); },
    async createEngagement(e) {
      const r = await pool.query('INSERT INTO engagements (client_id,title,type,status,summary,start_date,end_date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [e.client_id, e.title, e.type, e.status, e.summary, e.start_date, e.end_date]);
      return Number(r.rows[0].id);
    },
    async updateEngagement(id, e) {
      return (await pool.query('UPDATE engagements SET title=$1,type=$2,status=$3,summary=$4,start_date=$5,end_date=$6,updated_at=now() WHERE id=$7',
        [e.title, e.type, e.status, e.summary, e.start_date, e.end_date, id])).rowCount > 0;
    },
    async deleteEngagement(id) { return (await pool.query('DELETE FROM engagements WHERE id=$1', [id])).rowCount > 0; },
    async getEngagement(id) { return (await pool.query('SELECT * FROM engagements WHERE id=$1', [id])).rows[0] ?? null; },
    async listEngagementsByClient(clientId) {
      return (await pool.query('SELECT * FROM engagements WHERE client_id=$1 ORDER BY created_at DESC', [clientId])).rows;
    },
    async createFinding(f) {
      const r = await pool.query('INSERT INTO findings (engagement_id,title,severity,cvss,status,description,impact,remediation) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
        [f.engagement_id, f.title, f.severity, f.cvss ?? null, f.status, f.description, f.impact, f.remediation]);
      return Number(r.rows[0].id);
    },
    async updateFinding(id, f) {
      return (await pool.query(`UPDATE findings SET title=$1,severity=$2,cvss=$3,status=$4,description=$5,impact=$6,remediation=$7,updated_at=now(),
          resolved_at=CASE WHEN $4 IN ('resolved','closed') AND resolved_at IS NULL THEN now() WHEN $4 NOT IN ('resolved','closed') THEN NULL ELSE resolved_at END
        WHERE id=$8`,
        [f.title, f.severity, f.cvss ?? null, f.status, f.description, f.impact, f.remediation, id])).rowCount > 0;
    },
    async deleteFinding(id) { return (await pool.query('DELETE FROM findings WHERE id=$1', [id])).rowCount > 0; },
    async getFinding(id) { return (await pool.query('SELECT * FROM findings WHERE id=$1', [id])).rows[0] ?? null; },
    async listFindingsByEngagement(engId) {
      return (await pool.query(`SELECT * FROM findings WHERE engagement_id=$1 ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, id`, [engId])).rows;
    },
    // ---- assessments ----
    async listCompliance(clientId) {
      const r = await pool.query('SELECT control_id, maturity, evidence, owner, updated_at FROM compliance_status WHERE client_id=$1', [clientId]);
      return Object.fromEntries(r.rows.map(row => [row.control_id, row]));
    },
    async upsertCompliance(clientId, controlId, d) {
      await pool.query(`INSERT INTO compliance_status (client_id,control_id,maturity,evidence,owner) VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (client_id,control_id) DO UPDATE SET maturity=EXCLUDED.maturity, evidence=EXCLUDED.evidence, owner=EXCLUDED.owner, updated_at=now()`,
        [clientId, controlId, d.maturity, d.evidence || '', d.owner || '']);
      return true;
    },
    async createAssessment(a) {
      const r = await pool.query(
        `INSERT INTO assessments (name,organization,email,answers,domain_scores,total_score,grade,locale) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [a.name, a.organization, a.email, JSON.stringify(a.answers), JSON.stringify(a.domain_scores), a.total_score, a.grade, a.locale]
      );
      return Number(r.rows[0].id);
    },
    async listAssessments(limit, offset) {
      const [items, count] = await Promise.all([
        pool.query(`SELECT id,name,organization,email,domain_scores,total_score,grade,locale,created_at FROM assessments ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2`, [limit, offset]),
        pool.query('SELECT COUNT(*)::int n FROM assessments'),
      ]);
      return { total: count.rows[0].n, items: items.rows };
    },
    async getAssessment(id) {
      const r = await pool.query('SELECT * FROM assessments WHERE id=$1', [id]);
      return r.rows[0] ?? null;
    },
    async deleteAssessment(id) {
      const r = await pool.query('DELETE FROM assessments WHERE id=$1', [id]);
      return r.rowCount > 0;
    },
    async statsExtra() {
      const r = await pool.query('SELECT COUNT(*)::int n, COALESCE(ROUND(AVG(total_score)::numeric,1),0) a FROM assessments');
      return { assessments: r.rows[0].n, avgScore: Number(r.rows[0].a) };
    },
    async timeline(days) {
      const [sub, ass] = await Promise.all([
        pool.query(`SELECT to_char(created_at::date,'YYYY-MM-DD') d, COUNT(*)::int n FROM submissions WHERE created_at >= now() - ($1||' days')::interval GROUP BY 1`, [days]),
        pool.query(`SELECT to_char(created_at::date,'YYYY-MM-DD') d, COUNT(*)::int n FROM assessments WHERE created_at >= now() - ($1||' days')::interval GROUP BY 1`, [days]),
      ]);
      const s2 = Object.fromEntries(sub.rows.map(r => [r.d, r.n]));
      const a2 = Object.fromEntries(ass.rows.map(r => [r.d, r.n]));
      const out = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        out.push({ day: d, submissions: s2[d] || 0, assessments: a2[d] || 0 });
      }
      return out;
    },
    async addSubscriber(email, locale) {
      const r = await pool.query('INSERT INTO subscribers (email,locale) VALUES ($1,$2) ON CONFLICT (email) DO NOTHING', [email.toLowerCase(), locale]);
      return r.rowCount > 0;
    },
    async listSubscribers() {
      const [items, total] = await Promise.all([
        pool.query('SELECT id,email,locale,created_at FROM subscribers ORDER BY created_at DESC, id DESC'),
        pool.query('SELECT COUNT(*)::int AS n FROM subscribers'),
      ]);
      return { total: total.rows[0].n, items: items.rows.map((r) => ({ ...r, id: Number(r.id), created_at: iso(r.created_at) })) };
    },
    async deleteSubscriber(id) { return (await pool.query('DELETE FROM subscribers WHERE id=$1', [id])).rowCount > 0; },
    async stats() {
      const r = await pool.query(`SELECT
        (SELECT COUNT(*)::int FROM submissions) AS submissions,
        (SELECT COUNT(*)::int FROM submissions WHERE handled=false) AS "submissionsNew",
        (SELECT COUNT(*)::int FROM posts) AS posts,
        (SELECT COUNT(*)::int FROM posts WHERE published=true) AS "postsPublished",
        (SELECT COUNT(*)::int FROM subscribers) AS subscribers`);
      return r.rows[0];
    },
    async ping() { const r = await pool.query('SELECT 1 AS ok'); return r.rows[0].ok === 1; },
    async close() { await pool.end(); },
  };
}
