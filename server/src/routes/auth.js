import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { issueSession, clearSession, requireAuth } from '../auth.js';

const LoginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(200) });

export function authRouter(store, config) {
  const router = Router();
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'rate_limited' } });

  router.post('/login', loginLimiter, async (req, res, next) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed' });
    try {
      const admin = await store.findAdminByEmail(parsed.data.email);
      if (!admin || !bcrypt.compareSync(parsed.data.password, admin.password_hash)) {
        return res.status(401).json({ error: 'invalid_credentials' });
      }
      issueSession(res, config, admin);
      res.json({ ok: true, email: admin.email });
    } catch (e) { next(e); }
  });

  router.post('/logout', (req, res) => { clearSession(res); res.json({ ok: true }); });
  router.get('/me', requireAuth(config), (req, res) => res.json({ email: req.admin.email }));
  return router;
}
