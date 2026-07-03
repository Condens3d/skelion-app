import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { issueSession, clearSession, requireAuth } from '../auth.js';

const LoginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export function authRouter(db, config) {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'rate_limited' },
  });

  const byEmail = db.prepare('SELECT id, email, password_hash FROM admin_users WHERE email = ?');

  router.post('/login', loginLimiter, (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed' });

    const admin = byEmail.get(parsed.data.email.toLowerCase());
    // Constant-shape response: same error for unknown email and bad password
    if (!admin || !bcrypt.compareSync(parsed.data.password, admin.password_hash)) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    issueSession(res, config, admin);
    return res.json({ ok: true, email: admin.email });
  });

  router.post('/logout', (req, res) => {
    clearSession(res);
    res.json({ ok: true });
  });

  router.get('/me', requireAuth(config), (req, res) => {
    res.json({ email: req.admin.email });
  });

  return router;
}
