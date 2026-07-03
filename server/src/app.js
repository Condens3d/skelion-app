import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { contactRouter } from './routes/contact.js';
import { authRouter } from './routes/auth.js';
import { submissionsRouter } from './routes/submissions.js';

export function createApp(store, config) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", 'https://fonts.googleapis.com'],
        'font-src': ['https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        ...(config.isProd ? { 'upgrade-insecure-requests': [] } : {}),
      },
    },
    strictTransportSecurity: config.isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    xFrameOptions: { action: 'deny' },
  }));
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
  });

  app.use(express.json({ limit: '64kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', driver: store.driver }));
  app.use('/api/contact', contactRouter(store));
  app.use('/api/auth', authRouter(store, config));
  app.use('/api/submissions', submissionsRouter(store, config));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

  const dist = resolve(config.distPath);
  if (existsSync(dist)) {
    app.use(express.static(dist, {
      index: 'index.html',
      setHeaders(res, filePath) {
        if (filePath.includes('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        else if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
        else res.setHeader('Cache-Control', 'public, max-age=86400');
      },
    }));
    app.get('*', (req, res) => {
      if (extname(req.path)) return res.status(404).end();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(resolve(dist, 'index.html'));
    });
  }

  // JSON error handler (never leak stack traces to clients)
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('[error]', err.message);
    res.status(500).json({ error: 'internal_error' });
  });

  return app;
}
