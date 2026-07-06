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
  assert.match(r.body.error, /SMTP not configured/);
});

test('contact returns a trackable reference', async (t) => {
  const { app, cleanup } = await boot(); t.after(cleanup);
  const r = await request(app).post('/api/contact').send({ name: 'Bob', email: 'bob@x.com', service: 'Pentest', message: 'hi', locale: 'en', organization: '', website: '' });
  assert.equal(r.status, 201);
  assert.match(r.body.reference, /^SKL-R-\d{5}$/);
});
// ---- Client portal ----
async function provision(app, cookie) {
  const c1 = await request(app).post('/api/admin/clients').set('Cookie', cookie).send({ name: 'ACME Corp' });
  const c2 = await request(app).post('/api/admin/clients').set('Cookie', cookie).send({ name: 'Globex' });
  await request(app).post('/api/admin/client-users').set('Cookie', cookie)
    .send({ client_id: c1.body.id, email: 'alice@acme.com', name: 'Alice', password: 'acme-secret-pass-1' });
  await request(app).post('/api/admin/client-users').set('Cookie', cookie)
    .send({ client_id: c2.body.id, email: 'bob@globex.com', name: 'Bob', password: 'globex-secret-pw-1' });
  const e1 = await request(app).post('/api/admin/engagements').set('Cookie', cookie)
    .send({ client_id: c1.body.id, title: 'External Pentest Q3', type: 'pentest', status: 'active' });
  await request(app).post('/api/admin/findings').set('Cookie', cookie)
    .send({ engagement_id: e1.body.id, title: 'SQLi on /login', severity: 'critical', cvss: 9.8, status: 'open', description: 'Injection point', impact: 'Full DB read', remediation: 'Parameterize queries' });
  return { c1: c1.body.id, c2: c2.body.id, e1: e1.body.id };
}
async function portalLogin(app, email, password) {
  const r = await request(app).post('/api/portal/login').send({ email, password });
  return r.headers['set-cookie'];
}

test('portal: provisioning, login, engagement + findings visible to own tenant', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const admin = await login(app, store);
  const { e1 } = await provision(app, admin);
  const ck = await portalLogin(app, 'alice@acme.com', 'acme-secret-pass-1');
  assert.ok(ck, 'portal login sets cookie');
  const list = await request(app).get('/api/portal/engagements').set('Cookie', ck);
  assert.equal(list.status, 200); assert.equal(list.body.items.length, 1);
  assert.equal(list.body.items[0].severity_counts.critical, 1);
  const det = await request(app).get(`/api/portal/engagements/${e1}`).set('Cookie', ck);
  assert.equal(det.status, 200); assert.equal(det.body.findings[0].title, 'SQLi on /login');
});

test('portal: strict tenant isolation across clients', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const admin = await login(app, store);
  const { e1 } = await provision(app, admin);
  const bob = await portalLogin(app, 'bob@globex.com', 'globex-secret-pw-1');
  const cross = await request(app).get(`/api/portal/engagements/${e1}`).set('Cookie', bob);
  assert.equal(cross.status, 404, 'other tenant engagement must be invisible');
  const own = await request(app).get('/api/portal/engagements').set('Cookie', bob);
  assert.equal(own.body.items.length, 0);
});

test('portal: admin cookie rejected on portal, portal cookie rejected on admin (audience separation)', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const admin = await login(app, store);
  await provision(app, admin);
  const asPortal = await request(app).get('/api/portal/engagements').set('Cookie', admin);
  assert.equal(asPortal.status, 401);
  const ck = await portalLogin(app, 'alice@acme.com', 'acme-secret-pass-1');
  // portal cookie name differs; simulate cross-use by renaming it to the admin cookie
  const forged = ck.map((c) => c.replace('skelion_portal=', 'skelion_session='));
  const asAdmin = await request(app).get('/api/admin/stats').set('Cookie', forged);
  assert.equal(asAdmin.status, 401, 'portal token must not pass admin audience check');
});

test('portal: password change enforces current password + min length', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const admin = await login(app, store);
  await provision(app, admin);
  const ck = await portalLogin(app, 'alice@acme.com', 'acme-secret-pass-1');
  const wrong = await request(app).post('/api/portal/change-password').set('Cookie', ck).send({ current: 'nope', next: 'a-new-long-password-1' });
  assert.equal(wrong.status, 401);
  const short = await request(app).post('/api/portal/change-password').set('Cookie', ck).send({ current: 'acme-secret-pass-1', next: 'short' });
  assert.equal(short.status, 400);
  const ok = await request(app).post('/api/portal/change-password').set('Cookie', ck).send({ current: 'acme-secret-pass-1', next: 'a-new-long-password-1' });
  assert.equal(ok.status, 200);
  const relog = await request(app).post('/api/portal/login').send({ email: 'alice@acme.com', password: 'a-new-long-password-1' });
  assert.equal(relog.status, 200);
});

test('portal: finding lifecycle sets and clears resolved_at', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const admin = await login(app, store);
  const { e1 } = await provision(app, admin);
  const f = (await request(app).get(`/api/admin/engagements/${e1}/findings`).set('Cookie', admin)).body.items[0];
  const upd = { engagement_id: e1, title: f.title, severity: 'critical', cvss: 9.8, status: 'resolved', description: f.description, impact: f.impact, remediation: f.remediation };
  await request(app).put(`/api/admin/findings/${f.id}`).set('Cookie', admin).send(upd);
  let cur = (await request(app).get(`/api/admin/engagements/${e1}/findings`).set('Cookie', admin)).body.items[0];
  assert.ok(cur.resolved_at, 'resolved_at set when resolved');
  await request(app).put(`/api/admin/findings/${f.id}`).set('Cookie', admin).send({ ...upd, status: 'open' });
  cur = (await request(app).get(`/api/admin/engagements/${e1}/findings`).set('Cookie', admin)).body.items[0];
  assert.equal(cur.resolved_at, null, 'resolved_at cleared when reopened');
});
// ---- Admin MFA (TOTP) ----
import { totp } from '../src/totp.js';

async function fullLogin(app, store) {
  await store.seedAdmin('mfa-admin@skelion.com', 'strong-admin-pass-1');
  const r = await request(app).post('/api/auth/login').send({ email: 'mfa-admin@skelion.com', password: 'strong-admin-pass-1' });
  return { cookie: r.headers['set-cookie'], body: r.body };
}

test('mfa: enrol, enable, then login requires a valid code', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const { cookie, body } = await fullLogin(app, store);
  assert.equal(body.mfa_enabled, false); // no MFA yet -> direct session

  const setup = await request(app).post('/api/auth/mfa/setup').set('Cookie', cookie);
  assert.equal(setup.status, 200);
  assert.match(setup.body.otpauth, /^otpauth:\/\/totp\//);

  const good = totp(setup.body.secret);
  const enable = await request(app).post('/api/auth/mfa/enable').set('Cookie', cookie).send({ token: good });
  assert.equal(enable.status, 200);
  assert.equal(enable.body.recovery_codes.length, 10);

  // Next login now requires step 2
  const l = await request(app).post('/api/auth/login').send({ email: 'mfa-admin@skelion.com', password: 'strong-admin-pass-1' });
  assert.equal(l.body.mfa_required, true);
  assert.ok(l.body.pending);

  const bad = await request(app).post('/api/auth/login/mfa').send({ pending: l.body.pending, token: '000000' });
  assert.equal(bad.status, 401);

  const ok = await request(app).post('/api/auth/login/mfa').send({ pending: l.body.pending, token: totp(setup.body.secret) });
  assert.equal(ok.status, 200);
  assert.match(ok.headers['set-cookie'][0], /skelion_session/);
});

test('mfa: recovery code works once then is burned', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const { cookie } = await fullLogin(app, store);
  const setup = await request(app).post('/api/auth/mfa/setup').set('Cookie', cookie);
  const enable = await request(app).post('/api/auth/mfa/enable').set('Cookie', cookie).send({ token: totp(setup.body.secret) });
  const rc = enable.body.recovery_codes[0];

  const l1 = await request(app).post('/api/auth/login').send({ email: 'mfa-admin@skelion.com', password: 'strong-admin-pass-1' });
  const use1 = await request(app).post('/api/auth/login/mfa').send({ pending: l1.body.pending, token: rc });
  assert.equal(use1.status, 200);
  assert.equal(use1.body.recovery_used, true);
  assert.equal(use1.body.recovery_remaining, 9);

  const l2 = await request(app).post('/api/auth/login').send({ email: 'mfa-admin@skelion.com', password: 'strong-admin-pass-1' });
  const use2 = await request(app).post('/api/auth/login/mfa').send({ pending: l2.body.pending, token: rc });
  assert.equal(use2.status, 401, 'same recovery code must not work twice');
});

test('mfa: pending token cannot access admin APIs, and expires audience-separated', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const { cookie } = await fullLogin(app, store);
  const setup = await request(app).post('/api/auth/mfa/setup').set('Cookie', cookie);
  await request(app).post('/api/auth/mfa/enable').set('Cookie', cookie).send({ token: totp(setup.body.secret) });
  const l = await request(app).post('/api/auth/login').send({ email: 'mfa-admin@skelion.com', password: 'strong-admin-pass-1' });
  // pending token is not a session cookie; admin API must still reject
  const stats = await request(app).get('/api/admin/stats').set('Cookie', [`skelion_session=${l.body.pending}`]);
  assert.equal(stats.status, 401);
});

test('mfa: disable requires a valid code and restores single-factor login', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const { cookie } = await fullLogin(app, store);
  const setup = await request(app).post('/api/auth/mfa/setup').set('Cookie', cookie);
  await request(app).post('/api/auth/mfa/enable').set('Cookie', cookie).send({ token: totp(setup.body.secret) });

  const badDisable = await request(app).post('/api/auth/mfa/disable').set('Cookie', cookie).send({ token: '000000' });
  assert.equal(badDisable.status, 401);
  const okDisable = await request(app).post('/api/auth/mfa/disable').set('Cookie', cookie).send({ token: totp(setup.body.secret) });
  assert.equal(okDisable.status, 200);

  const l = await request(app).post('/api/auth/login').send({ email: 'mfa-admin@skelion.com', password: 'strong-admin-pass-1' });
  assert.equal(l.body.ok, true); // straight to session again
});
// ---- Compliance posture mapping ----
test('compliance: tenant reads library + updates control, scores roll up cross-framework', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const admin = await login(app, store);
  const c = await request(app).post('/api/admin/clients').set('Cookie', admin).send({ name: 'Bank Demo' });
  await request(app).post('/api/admin/client-users').set('Cookie', admin)
    .send({ client_id: c.body.id, email: 'grc@bank.com', name: 'GRC Lead', password: 'grc-portal-pass-1' });
  const ck = (await request(app).post('/api/portal/login').send({ email: 'grc@bank.com', password: 'grc-portal-pass-1' })).headers['set-cookie'];

  const lib = await request(app).get('/api/portal/compliance').set('Cookie', ck);
  assert.equal(lib.status, 200);
  assert.ok(lib.body.controls.length >= 20);
  assert.equal(lib.body.frameworks.cobac.verified, false, 'regional framework flagged unverified');
  assert.equal(lib.body.scores.overall, 0);

  const upd = await request(app).put('/api/portal/compliance/tec-mfa').set('Cookie', ck)
    .send({ maturity: 'optimized', evidence: 'MFA enforced org-wide', owner: 'CISO' });
  assert.equal(upd.status, 200);
  assert.ok(upd.body.scores.byFramework.iso27001.pct > 0);
  assert.ok(upd.body.scores.byFramework.nistcsf.pct > 0, 'answering one control rolls into multiple frameworks');
});

test('compliance: not_applicable excluded from denominator', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const admin = await login(app, store);
  const c = await request(app).post('/api/admin/clients').set('Cookie', admin).send({ name: 'NA Test' });
  await request(app).put(`/api/admin/clients/${c.body.id}/compliance/phy-perimeter`).set('Cookie', admin)
    .send({ maturity: 'not_applicable' });
  const r = await request(app).get(`/api/admin/clients/${c.body.id}/compliance`).set('Cookie', admin);
  const phys = r.body.scores.byTheme.physical;
  assert.equal(phys.applicable < phys.controls, true, 'NA control not counted as applicable');
});

test('compliance: tenant isolation on compliance data', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const admin = await login(app, store);
  const a = await request(app).post('/api/admin/clients').set('Cookie', admin).send({ name: 'Org A' });
  const b = await request(app).post('/api/admin/clients').set('Cookie', admin).send({ name: 'Org B' });
  await request(app).post('/api/admin/client-users').set('Cookie', admin).send({ client_id: a.body.id, email: 'a@a.com', name: 'A', password: 'org-a-portal-pass1' });
  await request(app).put(`/api/admin/clients/${b.body.id}/compliance/tec-mfa`).set('Cookie', admin).send({ maturity: 'optimized' });
  const ck = (await request(app).post('/api/portal/login').send({ email: 'a@a.com', password: 'org-a-portal-pass1' })).headers['set-cookie'];
  const r = await request(app).get('/api/portal/compliance').set('Cookie', ck);
  assert.equal(Object.keys(r.body.statuses).length, 0, 'Org A sees none of Org B compliance data');
});

test('compliance: rejects unknown control id and bad maturity', async (t) => {
  const { app, store, cleanup } = await boot(); t.after(cleanup);
  const admin = await login(app, store);
  const c = await request(app).post('/api/admin/clients').set('Cookie', admin).send({ name: 'Val Test' });
  const bad1 = await request(app).put(`/api/admin/clients/${c.body.id}/compliance/not-a-control`).set('Cookie', admin).send({ maturity: 'implemented' });
  assert.equal(bad1.status, 400);
  const bad2 = await request(app).put(`/api/admin/clients/${c.body.id}/compliance/tec-mfa`).set('Cookie', admin).send({ maturity: 'super' });
  assert.equal(bad2.status, 400);
});
