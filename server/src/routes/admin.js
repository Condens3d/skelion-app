import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { PostSchema, ClientSchema, ClientUserSchema, EngagementSchema, FindingSchema } from '../validation.js';

/** /api/admin — all endpoints require a valid session. */
export function adminRouter(store, config, mailer) {
  const router = Router();
  router.use(requireAuth(config));

  router.get('/timeline', async (_req, res, next) => {
    try { res.json({ days: await store.timeline(14) }); } catch (e) { next(e); }
  });

  router.get('/assessments', async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      res.json(await store.listAssessments(limit, offset));
    } catch (e) { next(e); }
  });

  router.get('/assessments/:id', async (req, res, next) => {
    try {
      const a = await store.getAssessment(Number(req.params.id));
      if (!a) return res.status(404).json({ error: 'not_found' });
      res.json(a);
    } catch (e) { next(e); }
  });

  router.delete('/assessments/:id', async (req, res, next) => {
    try {
      const ok = await store.deleteAssessment(Number(req.params.id));
      if (!ok) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  router.post('/test-email', async (_req, res) => {
    const result = await mailer.sendTest();
    res.status(result.ok ? 200 : 502).json(result);
  });

  router.get('/stats', async (_req, res, next) => {
    try {
      const [base, extra] = await Promise.all([store.stats(), store.statsExtra()]);
      res.json({ ...base, ...extra });
    } catch (e) { next(e); }
  });

  // ---- submissions ----
  router.get('/submissions', async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      res.json(await store.listSubmissions(limit, offset));
    } catch (e) { next(e); }
  });
  router.patch('/submissions/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'bad_id' });
    try {
      const ok = await store.setSubmissionHandled(id, !!req.body?.handled);
      if (!ok) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
  router.delete('/submissions/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'bad_id' });
    try {
      const ok = await store.deleteSubmission(id);
      if (!ok) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  // ---- insights (content CRUD) ----
  router.get('/insights', async (_req, res, next) => {
    try { res.json(await store.listAllPosts()); } catch (e) { next(e); }
  });
  router.get('/insights/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'bad_id' });
    try {
      const post = await store.getPostById(id);
      if (!post) return res.status(404).json({ error: 'not_found' });
      res.json(post);
    } catch (e) { next(e); }
  });
  router.post('/insights', async (req, res, next) => {
    const parsed = PostSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed', fields: parsed.error.flatten().fieldErrors });
    try {
      const id = await store.createPost(parsed.data);
      res.status(201).json({ ok: true, id });
    } catch (e) {
      if (String(e.message || '').match(/unique|UNIQUE|duplicate/i)) return res.status(409).json({ error: 'slug_exists' });
      next(e);
    }
  });
  router.put('/insights/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'bad_id' });
    const parsed = PostSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed', fields: parsed.error.flatten().fieldErrors });
    try {
      const ok = await store.updatePost(id, parsed.data);
      if (!ok) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) {
      if (String(e.message || '').match(/unique|UNIQUE|duplicate/i)) return res.status(409).json({ error: 'slug_exists' });
      next(e);
    }
  });
  router.delete('/insights/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'bad_id' });
    try {
      const ok = await store.deletePost(id);
      if (!ok) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  // ---- subscribers ----
  router.get('/subscribers', async (_req, res, next) => {
    try { res.json(await store.listSubscribers()); } catch (e) { next(e); }
  });
  router.delete('/subscribers/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'bad_id' });
    try {
      const ok = await store.deleteSubscriber(id);
      if (!ok) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });


  // ---- client portal management ----
  router.get('/clients', async (_req, res, next) => {
    try { res.json({ items: await store.listClients() }); } catch (e) { next(e); }
  });
  router.post('/clients', async (req, res, next) => {
    const p = ClientSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'validation_failed' });
    try { res.status(201).json({ id: await store.createClient(p.data.name) }); }
    catch (e) { if (/unique/i.test(String(e.message))) return res.status(409).json({ error: 'name_exists' }); next(e); }
  });
  router.delete('/clients/:id', async (req, res, next) => {
    try {
      const ok = await store.deleteClient(Number(req.params.id));
      if (!ok) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  router.get('/clients/:id/users', async (req, res, next) => {
    try { res.json({ items: await store.listClientUsers(Number(req.params.id)) }); } catch (e) { next(e); }
  });
  router.post('/client-users', async (req, res, next) => {
    const p = ClientUserSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'validation_failed', fields: p.error.flatten().fieldErrors });
    try {
      const id = await store.createClientUser({ ...p.data, password_hash: bcrypt.hashSync(p.data.password, 12) });
      res.status(201).json({ id });
    } catch (e) { if (/unique/i.test(String(e.message))) return res.status(409).json({ error: 'email_exists' }); next(e); }
  });
  router.post('/client-users/:id/reset-password', async (req, res, next) => {
    const pw = String(req.body?.password || '');
    if (pw.length < 12) return res.status(400).json({ error: 'validation_failed', hint: 'min 12 chars' });
    try {
      const ok = await store.setClientUserPassword(Number(req.params.id), bcrypt.hashSync(pw, 12));
      if (!ok) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
  router.delete('/client-users/:id', async (req, res, next) => {
    try {
      const ok = await store.deleteClientUser(Number(req.params.id));
      if (!ok) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  router.get('/clients/:id/engagements', async (req, res, next) => {
    try { res.json({ items: await store.listEngagementsByClient(Number(req.params.id)) }); } catch (e) { next(e); }
  });
  router.post('/engagements', async (req, res, next) => {
    const p = EngagementSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'validation_failed', fields: p.error.flatten().fieldErrors });
    try { res.status(201).json({ id: await store.createEngagement(p.data) }); } catch (e) { next(e); }
  });
  router.put('/engagements/:id', async (req, res, next) => {
    const p = EngagementSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'validation_failed', fields: p.error.flatten().fieldErrors });
    try {
      const ok = await store.updateEngagement(Number(req.params.id), p.data);
      if (!ok) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
  router.delete('/engagements/:id', async (req, res, next) => {
    try {
      const ok = await store.deleteEngagement(Number(req.params.id));
      if (!ok) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  router.get('/engagements/:id/findings', async (req, res, next) => {
    try { res.json({ items: await store.listFindingsByEngagement(Number(req.params.id)) }); } catch (e) { next(e); }
  });
  router.post('/findings', async (req, res, next) => {
    const p = FindingSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'validation_failed', fields: p.error.flatten().fieldErrors });
    try { res.status(201).json({ id: await store.createFinding(p.data) }); } catch (e) { next(e); }
  });
  router.put('/findings/:id', async (req, res, next) => {
    const p = FindingSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'validation_failed', fields: p.error.flatten().fieldErrors });
    try {
      const ok = await store.updateFinding(Number(req.params.id), p.data);
      if (!ok) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
  router.delete('/findings/:id', async (req, res, next) => {
    try {
      const ok = await store.deleteFinding(Number(req.params.id));
      if (!ok) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  return router;
}
