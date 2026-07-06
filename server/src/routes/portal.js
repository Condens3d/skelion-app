import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { issuePortalSession, clearPortalSession, requirePortalAuth } from '../auth.js';
import { FRAMEWORKS, MATURITY, CONTROLS, THEMES, computeScores, LIBRARY_VERSION } from '../compliance.js';
import { ComplianceStatusSchema } from '../validation.js';

const LoginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(200) });
const PasswordSchema = z.object({ current: z.string().min(1).max(200), next: z.string().min(12).max(200) });

/**
 * Client portal API. Separate trust boundary from the admin console:
 * dedicated cookie, dedicated JWT audience, and every data query scoped to
 * the client_id carried inside the verified session token. A client can never
 * address another tenant's engagement or finding, even by guessing ids.
 */
export function portalRouter(store, config) {
  const router = Router();
  const guard = requirePortalAuth(config);
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'rate_limited' } });

  router.post('/login', loginLimiter, async (req, res, next) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed' });
    try {
      const user = await store.findClientUserByEmail(parsed.data.email);
      // Constant-shape failure: no account enumeration.
      if (!user || !bcrypt.compareSync(parsed.data.password, user.password_hash)) {
        return res.status(401).json({ error: 'invalid_credentials' });
      }
      await store.touchClientLogin(user.id);
      issuePortalSession(res, config, user);
      res.json({ ok: true, email: user.email, name: user.name });
    } catch (e) { next(e); }
  });

  router.post('/logout', (_req, res) => { clearPortalSession(res); res.json({ ok: true }); });

  router.get('/me', guard, (req, res) => res.json({ email: req.client.email, name: req.client.name }));

  router.post('/change-password', guard, async (req, res, next) => {
    const parsed = PasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed', hint: 'new password must be at least 12 characters' });
    try {
      const user = await store.findClientUserByEmail(req.client.email);
      if (!user || !bcrypt.compareSync(parsed.data.current, user.password_hash)) {
        return res.status(401).json({ error: 'invalid_credentials' });
      }
      await store.setClientUserPassword(user.id, bcrypt.hashSync(parsed.data.next, 12));
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  // Engagement list for the authenticated tenant, with finding severity rollups.
  router.get('/engagements', guard, async (req, res, next) => {
    try {
      const engagements = await store.listEngagementsByClient(req.client.cid);
      const items = await Promise.all(engagements.map(async (e) => {
        const findings = await store.listFindingsByEngagement(e.id);
        const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        let open = 0;
        for (const f of findings) {
          if (f.severity in counts) counts[f.severity] += 1;
          if (f.status === 'open' || f.status === 'in_remediation') open += 1;
        }
        return { ...e, findings_total: findings.length, findings_open: open, severity_counts: counts };
      }));
      res.json({ items });
    } catch (e) { next(e); }
  });

  // Engagement detail + findings, tenant-checked.
  router.get('/engagements/:id', guard, async (req, res, next) => {
    try {
      const eng = await store.getEngagement(Number(req.params.id));
      if (!eng || Number(eng.client_id) !== Number(req.client.cid)) return res.status(404).json({ error: 'not_found' });
      const findings = await store.listFindingsByEngagement(eng.id);
      res.json({ ...eng, findings });
    } catch (e) { next(e); }
  });

  // Compliance program for the authenticated tenant.
  router.get('/compliance', guard, async (req, res, next) => {
    try {
      const statuses = await store.listCompliance(req.client.cid);
      res.json({
        version: LIBRARY_VERSION,
        frameworks: FRAMEWORKS, maturity: MATURITY, themes: THEMES, controls: CONTROLS,
        statuses,
        scores: computeScores(statuses),
      });
    } catch (e) { next(e); }
  });

  router.put('/compliance/:controlId', guard, async (req, res, next) => {
    const parsed = ComplianceStatusSchema.safeParse({ ...req.body, control_id: req.params.controlId });
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed' });
    try {
      await store.upsertCompliance(req.client.cid, parsed.data.control_id, parsed.data);
      const statuses = await store.listCompliance(req.client.cid);
      res.json({ ok: true, scores: computeScores(statuses) });
    } catch (e) { next(e); }
  });

  return router;
}
