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
  const config = {
    isProd: false,
    databaseUrl: '', // -> SQLite dev store
    sqlitePath: join(dir, 'test.db'),
    sessionSecret: 'test-secret-not-for-production',
    sessionHours: 1,
    distPath: join(dir, 'no-dist'),
    trustProxy: false,
  };
  const store = await createStore(config, { info() {}, warn() {}, error() {} });
  const app = createApp(store, config);
  return { app, store, cleanup: async () => { await store.close(); rmSync(dir, { recursive: true, force: true }); } };
}

test('health reports driver', async (t) => {
  const { app, cleanup } = await boot(); t.after(cleanup);
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.driver, 'sqlite');
});

test('contact: valid submission stored', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const res = await request(app).post('/api/contact').send({ name: 'Ada', email: 'ada@example.com', locale: 'fr' });
  assert.equal(res.status, 201);
  const { items } = await store.listSubmissions(10, 0);
  assert.equal(items[0].name, 'Ada');
  assert.equal(items[0].locale, 'fr');
  assert.equal(items[0].handled, 0);
});

test('contact: invalid email rejected', async (t) => {
  const { app, cleanup } = await boot(); t.after(cleanup);
  const res = await request(app).post('/api/contact').send({ name: 'X', email: 'bad' });
  assert.equal(res.status, 400);
  assert.ok(res.body.fields.email);
});

test('contact: honeypot stores nothing', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const res = await request(app).post('/api/contact').send({ name: 'Bot', email: 'b@spam.com', website: 'x' });
  assert.ok([202, 400].includes(res.status));
  const { total } = await store.listSubmissions(10, 0);
  assert.equal(total, 0);
});

test('auth: bad rejected, good sets hardened cookie', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  await store.seedAdmin('admin@skelionenterprises.com', 'correct-horse-battery');
  assert.equal((await request(app).post('/api/auth/login').send({ email: 'admin@skelionenterprises.com', password: 'wrong' })).status, 401);
  const good = await request(app).post('/api/auth/login').send({ email: 'admin@skelionenterprises.com', password: 'correct-horse-battery' });
  assert.equal(good.status, 200);
  const cookie = good.headers['set-cookie']?.[0] ?? '';
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
});

test('submissions: auth-gated list + mark handled', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  await store.seedAdmin('admin@skelionenterprises.com', 'correct-horse-battery');
  await store.createSubmission({ name: 'N1', organization: '', email: 'n1@x.com', service: '', message: '', locale: 'en' });
  assert.equal((await request(app).get('/api/submissions')).status, 401);
  const login = await request(app).post('/api/auth/login').send({ email: 'admin@skelionenterprises.com', password: 'correct-horse-battery' });
  const cookie = login.headers['set-cookie'];
  const list = await request(app).get('/api/submissions').set('Cookie', cookie);
  assert.equal(list.body.total, 1);
  const id = list.body.items[0].id;
  assert.equal((await request(app).patch(`/api/submissions/${id}`).set('Cookie', cookie).send({ handled: true })).status, 200);
  const after = await request(app).get('/api/submissions').set('Cookie', cookie);
  assert.equal(after.body.items[0].handled, 1);
  assert.ok(after.body.items[0].handled_at);
});

test('seed enforces min password length', async (t) => {
  const { store, cleanup } = await boot(); t.after(cleanup);
  await assert.rejects(() => store.seedAdmin('a@b.com', 'short'), /12 characters/);
});

test('strict CSP, no unsafe-inline', async (t) => {
  const { app, cleanup } = await boot(); t.after(cleanup);
  const csp = (await request(app).get('/api/health')).headers['content-security-policy'];
  assert.ok(csp.includes("script-src 'self'"));
  assert.ok(!csp.includes('unsafe-inline'));
});
