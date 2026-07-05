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

export function createApp(store, config, log = console) {
  const app = express();
  const mailer = createMailer(config, log);
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
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', driver: store.driver, api: 'v1' }));
  app.use('/api/contact', contactRouter(store, mailer));
  app.use('/api/auth', authRouter(store, config));
  app.use('/api/v1', publicApiRouter(store, mailer));
  app.use('/api/admin', adminRouter(store, config, mailer));
  app.use('/api/portal', portalRouter(store, config));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

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
