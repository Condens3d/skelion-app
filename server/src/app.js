import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { contactRouter } from './routes/contact.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { publicApiRouter } from './routes/publicApi.js';
import { portalRouter } from './routes/portal.js';
import { createMailer } from './mailer.js';

const SITE = process.env.PUBLIC_ORIGIN || 'https://skeliontech.com';
const SEC_CONTACT = process.env.SECURITY_CONTACT || 'info@skeliontech.com';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function createApp(store, config, log = console, mailer = null, opts = {}) {
  const app = express();
  const dbError = opts.dbError || null;
  // Reuse the mailer verified at boot when provided; otherwise build one
  // (keeps existing tests, which call createApp without a mailer, working).
  mailer = mailer || createMailer(config, log);
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'self'"], 'script-src': ["'self'"], 'style-src': ["'self'"],
        'font-src': ["'self'"], 'img-src': ["'self'", 'data:'], 'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"], 'base-uri': ["'self'"], 'form-action': ["'self'"],
        ...(config.isProd ? { 'upgrade-insecure-requests': [] } : {}),
      },
    },
    strictTransportSecurity: config.isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    xFrameOptions: { action: 'deny' },
  }));
  app.use((_req, res, next) => { res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'); next(); });
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());

  // ---- API ----
  app.get('/api/health', (_req, res) => res.json({ status: store ? 'ok' : 'degraded', driver: store ? store.driver : null, database: Boolean(store), api: 'v1' }));

  // Secure operator diagnostics: verifies DB + SMTP live and returns a plain
  // checklist with the exact remedy for anything failing. Gated by OPS_KEY.
  app.get('/api/ops/diagnostics', async (req, res) => {
    const key = req.get('x-ops-key') || req.query.ops_key;
    if (!config.opsKey || key !== config.opsKey) return res.status(404).json({ error: 'not_found' });
    const checks = [];

    // 1. Database
    let dbOk = false, dbErr = dbError;
    if (store) { try { dbOk = await store.ping(); } catch (e) { dbErr = e.message; } }
    else { dbErr = dbError || 'Database did not connect at boot.'; }
    checks.push({
      key: 'database',
      ok: dbOk,
      detail: dbOk ? `Connected (${store.driver}).` : `NOT connected. ${dbErr || ''}`,
      remedy: dbOk ? null : (config.isProd
        ? 'Set DATABASE_URL to your Supabase Session-pooler URI (postgresql://..., port 5432). If it is set but failing on TLS/certificate, add PGSSL_NO_VERIFY=1. Then redeploy.'
        : 'Local SQLite could not open. Check SQLITE_PATH is writable.'),
    });

    // 2. Production must be Postgres
    const driver = store ? store.driver : null;
    checks.push({
      key: 'db_driver_for_prod',
      ok: !config.isProd || driver === 'pg',
      detail: config.isProd ? `Production driver: ${driver || 'none (DB down)'}` : 'Development (SQLite is fine here).',
      remedy: (config.isProd && driver !== 'pg') ? 'Production is not on PostgreSQL. Set DATABASE_URL and redeploy.' : null,
    });

    // 3. Email
    const mail = await mailer.verify();
    checks.push({
      key: 'email',
      ok: mail.ok,
      detail: mail.ok ? `SMTP verified: ${mail.host}:${mail.port} -> ${mail.to}` : `Email disabled or failing. ${mail.error || ''}`,
      remedy: mail.ok ? null : 'Set SMTP_HOST=smtp.hostinger.com, SMTP_PORT=465, SMTP_SECURE=1, SMTP_USER=info@skeliontech.com, SMTP_PASS=<mailbox password>, CONTACT_RECIPIENT=info@skeliontech.com. The mailbox must exist in hPanel > Emails. Then redeploy and use "send test email" below.',
    });

    // 4. Public origin
    checks.push({
      key: 'public_origin',
      ok: Boolean(config.publicOrigin),
      detail: config.publicOrigin ? `PUBLIC_ORIGIN=${config.publicOrigin}` : 'PUBLIC_ORIGIN not set.',
      remedy: config.publicOrigin ? null : 'Set PUBLIC_ORIGIN=https://skeliontech.com so canonical URLs and RSS are correct.',
    });

    // 5. Admin account exists
    let adminExists = false;
    try { adminExists = store ? (await store.countAdmins?.()) > 0 : false; } catch { /* older driver */ }
    checks.push({
      key: 'admin_account',
      ok: adminExists,
      detail: adminExists ? 'At least one admin account exists.' : 'No admin account found.',
      remedy: adminExists ? null : 'Set ADMIN_EMAIL and ADMIN_PASSWORD env vars and redeploy once to seed your admin login, then remove them.',
    });

    let counts = { submissions: null, clients: null };
    try {
      const [subs, clients] = store ? await Promise.all([store.stats().catch(() => null), store.listClients().catch(() => null)]) : [null, null];
      counts = { submissions: subs?.submissions ?? null, clients: Array.isArray(clients) ? clients.length : null };
    } catch { /* non-fatal */ }

    const allOk = checks.every((c) => c.ok);
    res.json({
      time: new Date().toISOString(),
      env: config.isProd ? 'production' : 'development',
      healthy: allOk,
      summary: allOk ? 'All systems operational.' : 'One or more subsystems need attention. See remedies below.',
      checks,
      data: counts,
    });
  });

  // One-click SMTP test from the diagnostics key (sends a real email).
  app.post('/api/ops/test-email', async (req, res) => {
    const key = req.get('x-ops-key') || req.query.ops_key;
    if (!config.opsKey || key !== config.opsKey) return res.status(404).json({ error: 'not_found' });
    const result = await mailer.sendTest();
    res.status(result.ok ? 200 : 502).json(result);
  });
  // If the database failed to connect at boot, keep the server alive but return
  // a clear, actionable error for any data route instead of crashing per request.
  if (!store) {
    app.use('/api/contact', (_req, res) => res.status(503).json({ error: 'database_unavailable', detail: dbError }));
    app.use('/api/auth', (_req, res) => res.status(503).json({ error: 'database_unavailable', detail: dbError }));
    app.use('/api/v1', (_req, res) => res.status(503).json({ error: 'database_unavailable', detail: dbError }));
    app.use('/api/admin', (_req, res) => res.status(503).json({ error: 'database_unavailable', detail: dbError }));
    app.use('/api/portal', (_req, res) => res.status(503).json({ error: 'database_unavailable', detail: dbError }));
    app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));
  } else {
  app.use('/api/contact', contactRouter(store, mailer));
  app.use('/api/auth', authRouter(store, config));
  app.use('/api/v1', publicApiRouter(store, mailer));
  app.use('/api/admin', adminRouter(store, config, mailer));
  app.use('/api/portal', portalRouter(store, config));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));
  }

  // ---- security.txt (RFC 9116) ----
  app.get(['/.well-known/security.txt', '/security.txt'], (_req, res) => {
    const expires = new Date(Date.now() + 365 * 864e5).toISOString();
    res.type('text/plain').send(
      `# Skelion Enterprises security contact\nContact: mailto:${SEC_CONTACT}\nContact: tel:+237694429113\nExpires: ${expires}\nPreferred-Languages: en, fr\nCanonical: ${SITE}/.well-known/security.txt\n`
    );
  });

  // ---- RSS 2.0 feed of published insights ----
  app.get('/rss.xml', async (_req, res, next) => {
    try {
      const { items } = await store.listPublishedPosts(50, 0);
      const entries = items.map((p) => {
        const url = `${SITE}/insights/${p.slug}`;
        const date = p.published_at ? new Date(p.published_at).toUTCString() : new Date().toUTCString();
        return `    <item>\n      <title>${esc(p.title_en)}</title>\n      <link>${url}</link>\n      <guid isPermaLink="true">${url}</guid>\n      <description>${esc(p.excerpt_en)}</description>\n      <pubDate>${date}</pubDate>\n    </item>`;
      }).join('\n');
      res.type('application/rss+xml').send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>Skelion Enterprises — Insights</title>\n    <link>${SITE}/insights</link>\n    <description>Cybersecurity insights from Skelion Enterprises.</description>\n    <language>en</language>\n${entries}\n  </channel>\n</rss>\n`
      );
    } catch (e) { next(e); }
  });

  // ---- static SPA + prerendered routes ----
  const dist = resolve(config.distPath);
  if (existsSync(dist)) {
    app.use(express.static(dist, {
      index: 'index.html', redirect: false,
      setHeaders(res, filePath) {
        if (filePath.includes('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        else if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
        else res.setHeader('Cache-Control', 'public, max-age=86400');
      },
    }));
    app.get('*', (req, res) => {
      if (extname(req.path)) return res.status(404).end();
      res.setHeader('Cache-Control', 'no-cache');
      const clean = req.path.replace(/\/+$/, '');
      const candidate = resolve(dist, '.' + clean, 'index.html');
      if (clean && existsSync(candidate)) return res.sendFile(candidate);
      res.sendFile(resolve(dist, 'index.html'));
    });
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => { console.error('[error]', err.message); res.status(500).json({ error: 'internal_error' }); });
  return app;
}
