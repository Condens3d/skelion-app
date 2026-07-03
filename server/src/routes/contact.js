import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  organization: z.string().trim().max(200).optional().default(''),
  email: z.string().trim().email().max(254),
  service: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().max(5000).optional().default(''),
  locale: z.enum(['en', 'fr']).optional().default('en'),
  website: z.string().max(0).optional().default(''), // honeypot
});

export function contactRouter(store) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'rate_limited' } });

  router.post('/', limiter, async (req, res, next) => {
    const parsed = ContactSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed', fields: parsed.error.flatten().fieldErrors });
    const d = parsed.data;
    if (d.website !== '') return res.status(202).json({ ok: true });
    try {
      const id = await store.createSubmission(d);
      res.status(201).json({ ok: true, id });
    } catch (e) { next(e); }
  });
  return router;
}
