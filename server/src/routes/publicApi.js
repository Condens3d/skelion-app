import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { NewsletterSchema, AssessmentSchema } from '../validation.js';
import { score, reference } from '../assessment.js';

/** /api/v1 — public, read-mostly. Safe for third-party consumption. */
export function publicApiRouter(store, mailer, startedAt = Date.now()) {
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

  // Interactive security posture assessment: server-side scoring, stored as a lead.
  const assessLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'rate_limited' } });
  router.post('/assessment', assessLimiter, async (req, res, next) => {
    const parsed = AssessmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed', fields: parsed.error.flatten().fieldErrors });
    const d = parsed.data;
    if (d.website !== '') return res.status(202).json({ ok: true }); // honeypot
    try {
      const result = score(d.answers);
      const id = await store.createAssessment({
        name: d.name, organization: d.organization, email: d.email,
        answers: d.answers, domain_scores: result.domain_scores,
        total_score: result.total_score, grade: result.grade, locale: d.locale,
      });
      const ref = reference(id);
      if (mailer?.enabled) mailer.notifyAssessment({ ...d, ...result, reference: ref }).catch(() => {});
      res.status(201).json({ ok: true, reference: ref, ...result });
    } catch (e) { next(e); }
  });

  // Public system status: proves the platform and its database are alive.
  router.get('/status', async (_req, res) => {
    let dbOk = false;
    try { await store.stats(); dbOk = true; } catch { /* leave false */ }
    res.json({
      ok: dbOk,
      service: 'skelion-platform',
      database: { driver: store.driver, connected: dbOk },
      mail: { configured: Boolean(mailer?.enabled) },
      uptime_s: Math.floor((Date.now() - startedAt) / 1000),
      time: new Date().toISOString(),
    });
  });

  return router;
}
