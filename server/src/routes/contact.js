import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { ContactSchema } from '../validation.js';
import { submissionReference } from '../assessment.js';

export function contactRouter(store, mailer) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'rate_limited' } });
  router.post('/', limiter, async (req, res, next) => {
    const parsed = ContactSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed', fields: parsed.error.flatten().fieldErrors });
    const d = parsed.data;
    if (d.website !== '') return res.status(202).json({ ok: true }); // honeypot
    try {
      const id = await store.createSubmission(d);
      // fire-and-forget: email must never block or fail the response
      if (mailer?.enabled) mailer.notifyContact({ ...d, id }).catch(() => {});
      res.status(201).json({ ok: true, id, reference: submissionReference(id) });
    } catch (e) { next(e); }
  });
  return router;
}
