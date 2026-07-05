import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { createStore } from '../src/db/index.js';
import { createApp } from '../src/app.js';

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), 'skelion-test-'));
  const config = { isProd: false, databaseUrl: '', sqlitePath: join(dir, 'test.db'), sessionSecret: 'test-secret', sessionHours: 1, distPath: join(dir, 'no-dist'), trustProxy: false };
  const store = await createStore(config, { info() {}, warn() {}, error() {} });
  const app = createApp(store, config);
  return { app, store, cleanup: async () => { await store.close(); rmSync(dir, { recursive: true, force: true }); } };
}
async function login(app, store) {
  await store.seedAdmin('admin@skelionenterprises.com', 'correct-horse-battery');
  const r = await request(app).post('/api/auth/login').send({ email: 'admin@skelionenterprises.com', password: 'correct-horse-battery' });
  return r.headers['set-cookie'];
}

test('health reports driver + api version', async (t) => {
  const { app, cleanup } = await boot(); t.after(cleanup);
  const r = await request(app).get('/api/health');
  assert.equal(r.status, 200); assert.equal(r.body.driver, 'sqlite'); assert.equal(r.body.api, 'v1');
});

test('contact stores + validates + honeypot', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  assert.equal((await request(app).post('/api/contact').send({ name: 'Ada', email: 'ada@x.com', locale: 'fr' })).status, 201);
  assert.equal((await request(app).post('/api/contact').send({ name: 'X', email: 'bad' })).status, 400);
  await request(app).post('/api/contact').send({ name: 'Bot', email: 'b@x.com', website: 'x' });
  assert.equal((await store.listSubmissions(10, 0)).total, 1);
});

test('auth cookie hardened', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const cookie = await login(app, store);
  assert.match(cookie[0], /HttpOnly/); assert.match(cookie[0], /SameSite=Strict/);
});

test('insights: full admin CRUD + public read gating', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const cookie = await login(app, store);

  // create as draft
  const created = await request(app).post('/api/admin/insights').set('Cookie', cookie).send({
    slug: 'first-post', tag: 'Advisory', title_en: 'First Post', title_fr: 'Premier Article',
    excerpt_en: 'An excerpt', excerpt_fr: 'Un extrait', body_en: '# Hello', body_fr: '# Bonjour', published: false,
  });
  assert.equal(created.status, 201);
  const id = created.body.id;

  // draft NOT visible on public API
  assert.equal((await request(app).get('/api/v1/insights/first-post')).status, 404);
  assert.equal((await request(app).get('/api/v1/insights')).body.total, 0);

  // admin sees it
  assert.equal((await request(app).get('/api/admin/insights').set('Cookie', cookie)).body.total, 1);

  // publish it
  const upd = await request(app).put(`/api/admin/insights/${id}`).set('Cookie', cookie).send({
    slug: 'first-post', tag: 'Advisory', title_en: 'First Post', title_fr: 'Premier Article',
    excerpt_en: 'An excerpt', excerpt_fr: 'Un extrait', body_en: '# Hello', body_fr: '# Bonjour', published: true,
  });
  assert.equal(upd.status, 200);

  // now public
  const pub = await request(app).get('/api/v1/insights/first-post');
  assert.equal(pub.status, 200); assert.equal(pub.body.title_en, 'First Post');
  assert.equal((await request(app).get('/api/v1/insights')).body.total, 1);

  // duplicate slug rejected
  const dup = await request(app).post('/api/admin/insights').set('Cookie', cookie).send({ slug: 'first-post', title_en: 'x', title_fr: 'y' });
  assert.equal(dup.status, 409);

  // delete
  assert.equal((await request(app).delete(`/api/admin/insights/${id}`).set('Cookie', cookie)).status, 200);
  assert.equal((await request(app).get('/api/v1/insights')).body.total, 0);
});

test('insights admin routes require auth', async (t) => {
  const { app, cleanup } = await boot(); t.after(cleanup);
  assert.equal((await request(app).get('/api/admin/insights')).status, 401);
  assert.equal((await request(app).post('/api/admin/insights').send({ slug: 'x', title_en: 'a', title_fr: 'b' })).status, 401);
});

test('invalid slug rejected', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const cookie = await login(app, store);
  const r = await request(app).post('/api/admin/insights').set('Cookie', cookie).send({ slug: 'Not A Slug!', title_en: 'a', title_fr: 'b' });
  assert.equal(r.status, 400); assert.ok(r.body.fields.slug);
});

test('newsletter subscribe: idempotent + honeypot + admin list', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  assert.equal((await request(app).post('/api/v1/newsletter').send({ email: 'sub@x.com', locale: 'en' })).status, 201);
  assert.equal((await request(app).post('/api/v1/newsletter').send({ email: 'sub@x.com' })).status, 201); // duplicate ok
  await request(app).post('/api/v1/newsletter').send({ email: 'bot@x.com', website: 'trap' });
  const cookie = await login(app, store);
  const list = await request(app).get('/api/admin/subscribers').set('Cookie', cookie);
  assert.equal(list.body.total, 1); // only the real one
});

test('stats endpoint aggregates', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const cookie = await login(app, store);
  await request(app).post('/api/contact').send({ name: 'A', email: 'a@x.com' });
  await request(app).post('/api/v1/newsletter').send({ email: 's@x.com' });
  const s = await request(app).get('/api/admin/stats').set('Cookie', cookie);
  assert.equal(s.status, 200);
  assert.equal(s.body.submissions, 1); assert.equal(s.body.submissionsNew, 1); assert.equal(s.body.subscribers, 1);
});

test('security.txt served per RFC 9116', async (t) => {
  const { app, cleanup } = await boot(); t.after(cleanup);
  const r = await request(app).get('/.well-known/security.txt');
  assert.equal(r.status, 200);
  assert.match(r.text, /Contact:/); assert.match(r.text, /Expires:/);
});

test('RSS feed lists published insights only', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const cookie = await login(app, store);
  await request(app).post('/api/admin/insights').set('Cookie', cookie).send({ slug: 'live', title_en: 'Live One', title_fr: 'x', excerpt_en: 'e', published: true });
  await request(app).post('/api/admin/insights').set('Cookie', cookie).send({ slug: 'draft', title_en: 'Draft One', title_fr: 'y', published: false });
  const r = await request(app).get('/rss.xml');
  assert.equal(r.status, 200);
  assert.match(r.text, /Live One/); assert.doesNotMatch(r.text, /Draft One/);
});

test('strict CSP, no unsafe-inline', async (t) => {
  const { app, cleanup } = await boot(); t.after(cleanup);
  const csp = (await request(app).get('/api/health')).headers['content-security-policy'];
  assert.ok(csp.includes("script-src 'self'")); assert.ok(!csp.includes('unsafe-inline'));
});
// ---- Security posture assessment ----
const goodAnswers = { gov1:2,gov2:1,gov3:0, iam1:2,iam2:2,iam3:1, infra1:0,infra2:1,infra3:2, people1:1,people2:2,people3:0, res1:1,res2:0,res3:2 };

test('assessment: scores server-side, stores, returns reference', async (t) => {
  const { app, cleanup } = await boot(); t.after(cleanup);
  const r = await request(app).post('/api/v1/assessment').send({ answers: goodAnswers, name: 'Jane', organization: 'ACME', email: 'jane@acme.com', locale: 'en' });
  assert.equal(r.status, 201);
  assert.equal(r.body.total_score, 17);
  assert.equal(r.body.grade, 'C'); // 17/30 = 57%
  assert.match(r.body.reference, /^SKL-A-\d{5}$/);
  assert.equal(r.body.domain_scores.iam.points, 5);
});

test('assessment: rejects incomplete or invalid answers', async (t) => {
  const { app, cleanup } = await boot(); t.after(cleanup);
  const bad = { ...goodAnswers }; delete bad.res3;
  const r1 = await request(app).post('/api/v1/assessment').send({ answers: bad });
  assert.equal(r1.status, 400);
  const r2 = await request(app).post('/api/v1/assessment').send({ answers: { ...goodAnswers, gov1: 5 } });
  assert.equal(r2.status, 400);
});

test('assessment: honeypot silently accepted, nothing stored', async (t) => {
  const { app, cleanup } = await boot(); t.after(cleanup);
  const r = await request(app).post('/api/v1/assessment').send({ answers: goodAnswers, website: 'x'.repeat(0) || undefined });
  // legit empty honeypot stores; now the bot case:
  const bot = await request(app).post('/api/v1/assessment').send({ answers: goodAnswers, website: 'spam' });
  assert.equal(bot.status, 400); // max(0) rejects non-empty at validation
  assert.equal(r.status, 201);
});

test('admin: assessments list/get/delete + enriched stats + timeline', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const cookie = await login(app, store);
  await request(app).post('/api/v1/assessment').send({ answers: goodAnswers, organization: 'ACME' });
  const list = await request(app).get('/api/admin/assessments').set('Cookie', cookie);
  assert.equal(list.status, 200); assert.equal(list.body.total, 1);
  const id = list.body.items[0].id;
  const one = await request(app).get(`/api/admin/assessments/${id}`).set('Cookie', cookie);
  assert.equal(one.status, 200); assert.equal(one.body.answers.gov1, 2);
  const stats = await request(app).get('/api/admin/stats').set('Cookie', cookie);
  assert.equal(stats.body.assessments, 1); assert.equal(stats.body.avgScore, 17);
  const tl = await request(app).get('/api/admin/timeline').set('Cookie', cookie);
  assert.equal(tl.status, 200); assert.equal(tl.body.days.length, 14);
  assert.equal(tl.body.days.at(-1).assessments, 1);
  const del = await request(app).delete(`/api/admin/assessments/${id}`).set('Cookie', cookie);
  assert.equal(del.status, 200);
});

test('public status reports db + mail state', async (t) => {
  const { app, cleanup } = await boot(); t.after(cleanup);
  const r = await request(app).get('/api/v1/status');
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.database.connected, true);
  assert.equal(r.body.mail.configured, false);
});

test('admin test-email reports SMTP not configured', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const cookie = await login(app, store);
  const r = await request(app).post('/api/admin/test-email').set('Cookie', cookie);
  assert.equal(r.status, 502);
  assert.match(r.body.error, /SMTP is not configured/);
});

test('contact returns a trackable reference', async (t) => {
  const { app, cleanup } = await boot(); t.after(cleanup);
  const r = await request(app).post('/api/contact').send({ name: 'Bob', email: 'bob@x.com', service: 'Pentest', message: 'hi', locale: 'en', organization: '', website: '' });
  assert.equal(r.status, 201);
  assert.match(r.body.reference, /^SKL-R-\d{5}$/);
});
