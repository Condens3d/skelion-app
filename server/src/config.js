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
  opsKey: process.env.OPS_KEY || '',
  publicOrigin: process.env.PUBLIC_ORIGIN || '',
  // Email notifications (optional). If SMTP_HOST is unset, submissions are stored
  // in the admin panel only and no email is sent (graceful degradation).
  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === '1', // true for port 465
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    // From must match the authenticated mailbox on most SMTP providers (Hostinger
    // rejects mismatched senders), so default From to the SMTP user itself.
    from: process.env.MAIL_FROM || '',
    to: process.env.CONTACT_RECIPIENT || 'info@skeliontech.com',
  },
};

// Guard: in production, refuse to boot on the experimental embedded DB.
if (isProd && !/^postgres(ql)?:\/\//i.test(config.databaseUrl)) {
  throw new Error('Production requires a PostgreSQL DATABASE_URL (postgres://...). SQLite is dev-only.');
}
