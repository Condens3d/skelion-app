import { Router } from 'express';
import { requireAuth } from '../auth.js';

export function submissionsRouter(store, config) {
  const router = Router();
  router.use(requireAuth(config));

  router.get('/', async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      res.json(await store.listSubmissions(limit, offset));
    } catch (e) { next(e); }
  });

  router.patch('/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'bad_id' });
    try {
      const ok = await store.setSubmissionHandled(id, !!req.body?.handled);
      if (!ok) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  router.delete('/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'bad_id' });
    try {
      const ok = await store.deleteSubmission(id);
      if (!ok) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
  return router;
}
