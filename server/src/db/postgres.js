/**
 * PostgreSQL store — production (IIS + cloud, managed instance).
 * Parameterized queries throughout. TLS enforced unless PGSSL=disable.
 * Pool-based so a stateless app can scale horizontally.
 */
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

export async function createPostgresStore(config, log) {
  const ssl =
    process.env.PGSSL === 'disable'
      ? false
      : { rejectUnauthorized: process.env.PGSSL_NO_VERIFY !== '1' };

  const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl,
    max: Number(process.env.PGPOOL_MAX || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  pool.on('error', (err) => log.error?.('[pg] idle client error', err.message));

  // Schema migration (idempotent). Kept inline so a fresh DB self-provisions.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id            BIGSERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      organization  TEXT NOT NULL DEFAULT '',
      email         TEXT NOT NULL,
      service       TEXT NOT NULL DEFAULT '',
      message       TEXT NOT NULL DEFAULT '',
      locale        TEXT NOT NULL DEFAULT 'en',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      handled       BOOLEAN NOT NULL DEFAULT false,
      handled_at    TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions (created_at DESC);
    CREATE TABLE IF NOT EXISTS admin_users (
      id            BIGSERIAL PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Normalize row shapes to match the SQLite store (handled as 0/1, timestamps as strings)
  const mapSub = (r) => ({
    id: Number(r.id),
    name: r.name,
    organization: r.organization,
    email: r.email,
    service: r.service,
    message: r.message,
    locale: r.locale,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    handled: r.handled ? 1 : 0,
    handled_at: r.handled_at instanceof Date ? r.handled_at.toISOString() : r.handled_at,
  });

  return {
    driver: 'postgres',
    async createSubmission(d) {
      const r = await pool.query(
        `INSERT INTO submissions (name, organization, email, service, message, locale)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [d.name, d.organization, d.email, d.service, d.message, d.locale]
      );
      return Number(r.rows[0].id);
    },
    async listSubmissions(limit, offset) {
      const [items, total] = await Promise.all([
        pool.query(
          `SELECT id, name, organization, email, service, message, locale, created_at, handled, handled_at
           FROM submissions ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2`,
          [limit, offset]
        ),
        pool.query('SELECT COUNT(*)::int AS n FROM submissions'),
      ]);
      return { total: total.rows[0].n, items: items.rows.map(mapSub) };
    },
    async setSubmissionHandled(id, handled) {
      const r = await pool.query(
        `UPDATE submissions SET handled = $1,
           handled_at = CASE WHEN $1 THEN now() ELSE NULL END
         WHERE id = $2`,
        [handled, id]
      );
      return r.rowCount > 0;
    },
    async deleteSubmission(id) {
      const r = await pool.query('DELETE FROM submissions WHERE id = $1', [id]);
      return r.rowCount > 0;
    },
    async findAdminByEmail(email) {
      const r = await pool.query(
        'SELECT id, email, password_hash FROM admin_users WHERE email = $1',
        [email.toLowerCase()]
      );
      return r.rows[0] ?? null;
    },
    async seedAdmin(email, password) {
      const c = await pool.query('SELECT COUNT(*)::int AS n FROM admin_users');
      if (c.rows[0].n > 0) return false;
      if (!email || !password) { log.warn?.('[seed] admin env not set; /admin unusable until seeded.'); return false; }
      if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
      await pool.query('INSERT INTO admin_users (email, password_hash) VALUES ($1,$2)', [
        email.toLowerCase(),
        bcrypt.hashSync(password, 12),
      ]);
      log.info?.(`[seed] admin created for ${email}`);
      return true;
    },
    async close() { await pool.end(); },
  };
}
