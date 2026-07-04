import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { NewsletterSchema } from '../validation.js';

/** /api/v1 — public, read-mostly. Safe for third-party consumption. */
export function publicApiRouter(store) {
  const router = Router();

  // Published insights list
  router.get('/insights', async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      res.json(await store.listPublishedPosts(limit, offset));
    } catch (e) { next(e); }
  });

  // Single published insight by slug
  router.get('/insights/:slug', async (req, res, next) => {
    try {
      const post = await store.getPublishedPostBySlug(String(req.params.slug));
      if (!post) return res.status(404).json({ error: 'not_found' });
      res.json(post);
    } catch (e) { next(e); }
  });

  // Newsletter subscribe (rate-limited + honeypot)
  const subLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'rate_limited' } });
  router.post('/newsletter', subLimiter, async (req, res, next) => {
    const parsed = NewsletterSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed', fields: parsed.error.flatten().fieldErrors });
    if (parsed.data.website !== '') return res.status(202).json({ ok: true });
    try {
      await store.addSubscriber(parsed.data.email, parsed.data.locale);
      res.status(201).json({ ok: true }); // idempotent: same response whether new or existing
    } catch (e) { next(e); }
  });

  return router;
}
