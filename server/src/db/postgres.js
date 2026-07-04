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
    async findAdminByEmail(email) {
      const r = await pool.query('SELECT id,email,password_hash FROM admin_users WHERE email=$1', [email.toLowerCase()]);
      return r.rows[0] ?? null;
    },
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
    async close() { await pool.end(); },
  };
}
