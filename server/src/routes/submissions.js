import { Router } from 'express';
import { requireAuth } from '../auth.js';

export function submissionsRouter(db, config) {
  const router = Router();
  router.use(requireAuth(config));

  const list = db.prepare(
    `SELECT id, name, organization, email, service, message, locale, created_at, handled, handled_at
     FROM submissions ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
  );
  const count = db.prepare('SELECT COUNT(*) AS n FROM submissions');
  const setHandled = db.prepare(
    `UPDATE submissions SET handled = ?, handled_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END WHERE id = ?`
  );
  const remove = db.prepare('DELETE FROM submissions WHERE id = ?');

  router.get('/', (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    res.json({ total: count.get().n, items: list.all(limit, offset) });
  });

  router.patch('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'bad_id' });
    const handled = req.body?.handled ? 1 : 0;
    const info = setHandled.run(handled, handled, id);
    if (info.changes === 0) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  });

  router.delete('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'bad_id' });
    const info = remove.run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  });

  return router;
}
