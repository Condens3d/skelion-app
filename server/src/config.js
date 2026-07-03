import 'dotenv/config';
import crypto from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';

function required(name) {
  const v = process.env[name];
  if (v) return v;
  throw new Error(`Missing required environment variable: ${name}`);
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 8080),
  // Production: postgres:// DSN. Dev/local: leave unset to use SQLite.
  databaseUrl: process.env.DATABASE_URL || '',
  sqlitePath: process.env.SQLITE_PATH || './data/skelion.db',
  distPath: process.env.DIST_PATH || '../dist',
  sessionSecret: isProd ? required('SESSION_SECRET') : (process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex')),
  sessionHours: Number(process.env.SESSION_HOURS || 8),
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  trustProxy: process.env.TRUST_PROXY === '1',
};

// Guard: in production, refuse to boot on the experimental embedded DB.
if (isProd && !/^postgres(ql)?:\/\//i.test(config.databaseUrl)) {
  throw new Error('Production requires a PostgreSQL DATABASE_URL (postgres://...). SQLite is dev-only.');
}
