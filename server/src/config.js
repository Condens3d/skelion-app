import 'dotenv/config';
import crypto from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';

function required(name, devFallback) {
  const v = process.env[name];
  if (v) return v;
  if (!isProd && devFallback !== undefined) return devFallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 8080),
  dbPath: process.env.DATABASE_PATH || './data/skelion.db',
  distPath: process.env.DIST_PATH || '../dist',
  // JWT secret: required in production; random per-boot in dev (logins reset on restart)
  sessionSecret: isProd
    ? required('SESSION_SECRET')
    : process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  sessionHours: Number(process.env.SESSION_HOURS || 8),
  // Initial admin seed (only used when the admin table is empty)
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  // Set to '1' behind a TLS-terminating proxy (IIS/ARR, nginx, load balancer)
  trustProxy: process.env.TRUST_PROXY === '1',
};
