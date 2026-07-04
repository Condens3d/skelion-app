import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { ContactSchema } from '../validation.js';

export function contactRouter(store) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'rate_limited' } });
  router.post('/', limiter, async (req, res, next) => {
    const parsed = ContactSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed', fields: parsed.error.flatten().fieldErrors });
    const d = parsed.data;
    if (d.website !== '') return res.status(202).json({ ok: true });
    try { res.status(201).json({ ok: true, id: await store.createSubmission(d) }); } catch (e) { next(e); }
  });
  return router;
}
