import { adminExtras, AdminAssessmentRow, TimelineDay, opsApi } from '../lib/api';
import ClientsManager from '../components/admin/ClientsManager';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';
import { renderMarkdown } from '../lib/mdRender';
import {
  adminApi,
  ApiError,
  type AdminPostRow,
  type PostFull,
  type PostInput,
  type Stats,
  type Submission,
  type Subscriber,
} from '../lib/api';

const field = 'w-full neu-inset text-paper font-body text-[.92rem] px-[14px] py-[11px] focus:outline-none border-0';
const label = 'font-mono text-[.72rem] text-slate tracking-[.1em] uppercase block mb-[6px]';
type Tab = 'overview' | 'insights' | 'submissions' | 'assessments' | 'clients' | 'subscribers';

export default function Admin() {
  const { t } = useTranslation();
  useSeo({ title: t('admin.seoTitle'), description: '', path: '/admin', noindex: true });
  const [session, setSession] = useState<{ checking: boolean; email: string | null }>({ checking: true, email: null });
  useEffect(() => { adminApi.me().then((d) => setSession({ checking: false, email: d?.email ?? null })); }, []);
  if (session.checking) {
    return (
      <div className="pt-[150px] pb-24 wrap font-mono text-slate text-[.9rem]">
        <span className="text-cyan">$</span> whoami <span className="inline-block w-2 h-4 bg-teal align-[-2px] animate-blink-fast" />
      </div>
    );
  }
  return (
    <section className="pt-[120px] pb-24 min-h-screen">
      <div className="wrap">
        <div className="cmd">{t('admin.cmd')}</div>
        <h1 className="h2-display">{t('admin.title')}</h1>
        {session.email
          ? <Dashboard email={session.email} onLogout={() => setSession({ checking: false, email: null })} />
          : <Login onAuth={(email) => setSession({ checking: false, email })} />}
      </div>
    </section>
  );
}

function Login({ onAuth }: { onAuth: (email: string) => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    try {
      const res = await adminApi.login(data.email, data.password);
      if (res.ok) onAuth((await res.json()).email);
      else if (res.status === 429) setError(t('admin.rateLimited'));
      else setError(t('admin.loginFailed'));
    } catch { setError(t('admin.serverDown')); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="neu-raised p-9 max-w-[420px] mt-10 flex flex-col gap-[18px]">
      <span className="mini-mono text-teal">{`// ${t('admin.loginTitle').toUpperCase()}`}</span>
      <div><label htmlFor="a-email" className={label}>{t('admin.email')}</label>
        <input id="a-email" name="email" type="email" required autoComplete="username" className={field} /></div>
      <div><label htmlFor="a-pass" className={label}>{t('admin.password')}</label>
        <input id="a-pass" name="password" type="password" required autoComplete="current-password" className={field} /></div>
      <button type="submit" disabled={busy} className="btn btn-primary neu-btn justify-center disabled:opacity-50">
        {busy ? t('admin.loginBusy') : t('admin.loginBtn')}</button>
      {error && <span className="font-mono text-[.78rem] text-termred" role="alert">{error}</span>}
      <OpsPanel />
    </form>
  );
}

// Operator diagnostics inside the login gate. Reads OPS_KEY from the URL
// (?ops=KEY) or a prompt, and shows live DB + SMTP health without logging in.
function OpsPanel() {
  const { t } = useTranslation();
  const [key, setKey] = useState('');
  const [diag, setDiag] = useState<import('../lib/api').Diagnostics | null>(null);
  const [err, setErr] = useState('');
  const [mailMsg, setMailMsg] = useState('');
  useEffect(() => {
    const u = new URL(window.location.href);
    const k = u.searchParams.get('ops');
    if (k) setKey(k);
  }, []);
  async function run(k: string) {
    setErr(''); setDiag(null);
    try { setDiag(await opsApi.diagnostics(k)); }
    catch { setErr(t('admin.ops.badKey')); }
  }
  useEffect(() => { if (key) run(key); /* eslint-disable-next-line */ }, [key]);
  async function testMail() {
    setMailMsg('...');
    try { const r = await opsApi.testEmail(key); setMailMsg(r.ok ? t('admin.ops.mailOk', { to: r.to }) : (r.error || t('admin.ops.mailFail'))); }
    catch { setMailMsg(t('admin.ops.mailFail')); }
  }
  if (!key && !diag) {
    return (
      <button type="button" onClick={() => { const k = prompt(t('admin.ops.enterKey')); if (k) setKey(k); }}
        className="font-mono text-[.72rem] text-slate hover:text-cyan self-start">{t('admin.ops.check')}</button>
    );
  }
  const dot = (ok: boolean) => (ok ? 'text-teal' : 'text-termred');
  return (
    <div className="neu-inset p-4 rounded-brand font-mono text-[.74rem] grid gap-2 mt-1">
      <span className="text-slate uppercase tracking-[.08em]">{t('admin.ops.title')}</span>
      {err && <span className="text-termred">{err}</span>}
      {diag && (
        <>
          <span className={dot(diag.database.connected)}>
            db: {diag.database.driver} {diag.database.connected ? 'connected' : 'DOWN'} {diag.database.error ? `(${diag.database.error})` : ''}
          </span>
          {diag.data && <span className="text-paper-dim">data: {diag.data.submissions ?? '?'} messages · {diag.data.clients ?? '?'} clients</span>}
          <span className={dot(diag.mail.ok)}>
            mail: {diag.mail.ok ? `${diag.mail.host}:${diag.mail.port} -> ${diag.mail.to}` : `DISABLED (${diag.mail.error})`}
          </span>
          <div className="flex items-center gap-3 mt-1">
            <button type="button" onClick={testMail} className="text-cyan hover:underline">{t('admin.ops.sendTest')}</button>
            {mailMsg && <span className={mailMsg.includes('->') || mailMsg.includes('sent') ? 'text-teal' : 'text-paper-dim'}>{mailMsg}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function Dashboard({ email, onLogout }: { email: string; onLogout: () => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('overview');
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: t('admin.tabOverview') },
    { id: 'insights', label: t('admin.tabInsights') },
    { id: 'submissions', label: t('admin.tabSubmissions') },
    { id: 'assessments', label: t('admin.tabAssessments') },
    { id: 'clients', label: t('admin.tabClients') },
    { id: 'subscribers', label: t('admin.tabSubscribers') },
  ];
  async function logout() { await adminApi.logout(); onLogout(); }
  return (
    <div className="mt-9">
      <div className="flex justify-between items-center gap-4 flex-wrap mb-7 font-mono text-[.8rem]">
        <span className="text-slate">{t('admin.loggedInAs')}: <span className="text-teal">{email}</span></span>
        <button onClick={logout} className="btn btn-ghost neu-btn !py-[9px] !px-[18px] !text-[.8rem]">{t('admin.logout')}</button>
      </div>
      <div className="flex gap-2 flex-wrap mb-8 neu-inset p-1.5 w-fit max-[560px]:w-full">
        {tabs.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)} aria-pressed={tab === tb.id}
            className={`font-mono text-[.78rem] px-4 py-2 rounded-brand transition-colors ${tab === tb.id ? 'bg-cyan text-ink font-medium' : 'text-paper-dim hover:text-cyan'}`}>
            {tb.label}</button>
        ))}
      </div>
      {tab === 'overview' && <Overview onGo={setTab} />}
      {tab === 'insights' && <InsightsManager />}
      {tab === 'submissions' && <SubmissionsList />}
      {tab === 'assessments' && <AssessmentsList />}
      {tab === 'clients' && <ClientsManager />}
      {tab === 'subscribers' && <SubscribersList />}
    </div>
  );
}

function Overview({ onGo }: { onGo: (t: Tab) => void }) {
  const { t } = useTranslation();
  const [s, setS] = useState<(Stats & { assessments?: number; avgScore?: number }) | null>(null);
  const [days, setDays] = useState<TimelineDay[]>([]);
  const [mailTest, setMailTest] = useState<'idle' | 'busy' | 'ok' | 'fail'>('idle');
  const [mailMsg, setMailMsg] = useState('');
  useEffect(() => {
    adminApi.stats().then(setS).catch(() => setS(null));
    adminExtras.timeline().then((r) => setDays(r.days)).catch(() => setDays([]));
  }, []);
  const tiles: { k: string; label: string; go?: Tab; accent?: boolean }[] = [
    { k: 'submissionsNew', label: t('admin.statNewMsgs'), go: 'submissions', accent: true },
    { k: 'submissions', label: t('admin.statTotalMsgs'), go: 'submissions' },
    { k: 'assessments', label: t('admin.statAssessments'), go: 'assessments', accent: true },
    { k: 'avgScore', label: t('admin.statAvgScore'), go: 'assessments' },
    { k: 'postsPublished', label: t('admin.statPublished'), go: 'insights' },
    { k: 'posts', label: t('admin.statTotalPosts'), go: 'insights' },
    { k: 'subscribers', label: t('admin.statSubscribers'), go: 'subscribers' },
  ];
  const maxBar = Math.max(1, ...days.map((d) => d.submissions + d.assessments));
  async function testEmail() {
    setMailTest('busy'); setMailMsg('');
    try {
      const r = await adminExtras.testEmail();
      setMailTest('ok'); setMailMsg(t('admin.mailTestOk', { to: r.to }));
    } catch (e) {
      setMailTest('fail');
      const body = (e as { body?: { error?: string } }).body;
      setMailMsg(body?.error || t('admin.mailTestFail'));
    }
  }
  return (
    <div className="grid gap-[18px]">
      <div className="grid grid-cols-4 max-[1024px]:grid-cols-2 max-[560px]:grid-cols-1 gap-[18px]">
        {tiles.map((tile) => (
          <button key={tile.k} onClick={() => tile.go && onGo(tile.go)} className="neu neu-hover p-6 text-left">
            <span className={`font-display font-bold text-[2.1rem] block leading-none mb-2 ${tile.accent ? 'text-cyan' : 'text-paper'}`}>
              {s ? ((s as unknown as Record<string, number | undefined>)[tile.k] ?? 0) : '—'}
            </span>
            <span className="font-mono text-[.72rem] text-slate tracking-[.08em] uppercase">{tile.label}</span>
          </button>
        ))}
      </div>

      <div className="neu p-6">
        <div className="font-mono text-[.72rem] text-slate tracking-[.08em] uppercase mb-4">{t('admin.activity14d')}</div>
        <div className="flex items-end gap-[6px] h-[90px]" role="img" aria-label={t('admin.activity14d')}>
          {days.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col justify-end gap-[2px]" title={`${d.day}: ${d.submissions} / ${d.assessments}`}>
              <div className="bg-teal/80 rounded-t-sm" style={{ height: `${(d.assessments / maxBar) * 100}%`, minHeight: d.assessments ? 3 : 0 }} />
              <div className="bg-cyan/80 rounded-t-sm" style={{ height: `${(d.submissions / maxBar) * 100}%`, minHeight: d.submissions ? 3 : 1 }} />
            </div>
          ))}
        </div>
        <div className="flex gap-5 mt-3 font-mono text-[.7rem] text-paper-dim">
          <span><span className="inline-block w-[10px] h-[10px] bg-cyan/80 rounded-sm mr-1.5 align-middle" />{t('admin.legendSubmissions')}</span>
          <span><span className="inline-block w-[10px] h-[10px] bg-teal/80 rounded-sm mr-1.5 align-middle" />{t('admin.legendAssessments')}</span>
        </div>
      </div>

      <div className="neu p-6 flex flex-wrap items-center gap-4">
        <div className="mr-auto">
          <div className="font-mono text-[.72rem] text-slate tracking-[.08em] uppercase mb-1">{t('admin.mailTestTitle')}</div>
          <div className="text-paper-dim text-[.85rem]">{t('admin.mailTestDesc')}</div>
        </div>
        <button onClick={testEmail} disabled={mailTest === 'busy'} className="btn btn-ghost neu-btn !py-[9px] !px-[18px] !text-[.8rem] disabled:opacity-50">
          {mailTest === 'busy' ? t('admin.mailTestBusy') : t('admin.mailTestBtn')}
        </button>
        {mailMsg && (
          <div className={`w-full font-mono text-[.78rem] ${mailTest === 'ok' ? 'text-teal' : 'text-termred'}`} role="status">{mailMsg}</div>
        )}
      </div>
    </div>
  );
}

function AssessmentsList() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<AdminAssessmentRow[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const load = () => adminExtras.assessments().then((r) => setRows(r.items)).catch(() => setRows([]));
  useEffect(() => { load(); }, []);
  async function remove(id: number) {
    if (!confirm(t('admin.delConfirm'))) return;
    await adminExtras.deleteAssessment(id).catch(() => {});
    load();
  }
  if (rows.length === 0) return <p className="font-mono text-[.85rem] text-paper-dim">{t('admin.noAssessments')}</p>;
  return (
    <div className="grid gap-3">
      {rows.map((a) => (
        <div key={a.id} className="neu p-5">
          <button className="w-full text-left flex flex-wrap items-center gap-x-5 gap-y-1" onClick={() => setOpenId(openId === a.id ? null : a.id)}>
            <span className="font-mono text-[.78rem] text-cyan">SKL-A-{String(a.id).padStart(5, '0')}</span>
            <span className={`font-display font-bold ${a.grade === 'A' || a.grade === 'B' ? 'text-teal' : a.grade === 'E' ? 'text-termred' : 'text-termamber'}`}>
              {a.grade} · {a.total_score}/30
            </span>
            <span className="text-paper text-[.9rem]">{a.organization || a.name || '—'}</span>
            <span className="font-mono text-[.72rem] text-paper-dim ml-auto">{new Date(a.created_at).toLocaleString()}</span>
          </button>
          {openId === a.id && (
            <div className="mt-4 pt-4 border-t border-soft grid gap-2 font-mono text-[.78rem]">
              <div className="text-paper-dim">{a.name || '—'} · {a.email || '—'} · {a.locale}</div>
              {Object.entries(a.domain_scores).map(([d, ds]) => (
                <div key={d} className="flex items-center gap-3">
                  <span className="w-[120px] text-paper-dim">{t(`assessment.domains.${d}`)}</span>
                  <div className="flex-1 h-[6px] bg-ink-3 rounded-full overflow-hidden">
                    <div className={ds.pct >= 67 ? 'h-full bg-teal' : ds.pct >= 34 ? 'h-full bg-termamber' : 'h-full bg-termred'} style={{ width: `${Math.max(ds.pct, 4)}%` }} />
                  </div>
                  <span className="text-paper">{ds.points}/{ds.max}</span>
                </div>
              ))}
              <button onClick={() => remove(a.id)} className="mt-2 w-fit font-mono text-[.75rem] text-termred hover:underline">{t('admin.del')}</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const EMPTY: PostInput = { slug: '', tag: '', title_en: '', title_fr: '', excerpt_en: '', excerpt_fr: '', body_en: '', body_fr: '', published: false };

function InsightsManager() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<AdminPostRow[] | null>(null);
  const [editing, setEditing] = useState<{ id: number | null } | null>(null);
  const load = useCallback(() => { adminApi.listPosts().then((d) => setRows(d.items)).catch(() => setRows([])); }, []);
  useEffect(load, [load]);
  if (editing) return <PostEditor id={editing.id} onDone={() => { setEditing(null); load(); }} />;
  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <h2 className="font-display font-semibold text-[1.3rem]">{t('admin.insightsTitle')}</h2>
        <button onClick={() => setEditing({ id: null })} className="btn btn-primary neu-btn !py-[10px] !px-[20px] !text-[.82rem]">{t('admin.newPost')}</button>
      </div>
      {rows === null && <p className="font-mono text-[.85rem] text-slate">{t('admin.loading')}</p>}
      {rows !== null && rows.length === 0 && <p className="font-mono text-[.85rem] text-slate">{t('admin.noPosts')}</p>}
      <div className="flex flex-col gap-3">
        {rows?.map((r) => (
          <article key={r.id} className="neu p-5 grid grid-cols-[1fr_auto] max-[640px]:grid-cols-1 gap-4 items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <span className={`font-mono text-[.66rem] tracking-[.12em] px-2 py-[3px] rounded font-medium ${r.published ? 'bg-teal text-ink' : 'bg-slate text-ink'}`}>{r.published ? t('admin.published') : t('admin.draft')}</span>
                {r.tag && <span className="font-mono text-[.7rem] text-teal uppercase tracking-[.08em]">{r.tag}</span>}
                <span className="mini-mono">/{r.slug}</span>
              </div>
              <b className="font-display text-[1.02rem]">{r.title_en}</b>
            </div>
            <div className="flex gap-2 shrink-0 max-[640px]:flex-wrap">
              <button onClick={() => setEditing({ id: r.id })} className="font-mono text-[.76rem] px-3.5 py-2 neu-btn text-paper-dim hover:text-cyan">{t('admin.edit')}</button>
              <button onClick={async () => { if (!window.confirm(t('admin.delPostConfirm'))) return; await adminApi.deletePost(r.id); load(); }} className="font-mono text-[.76rem] px-3.5 py-2 neu-btn text-paper-dim hover:text-termred">{t('admin.del')}</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PostEditor({ id, onDone }: { id: number | null; onDone: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<PostInput>(EMPTY);
  const [loaded, setLoaded] = useState(id === null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewFr, setPreviewFr] = useState(false);
  useEffect(() => {
    if (id !== null) {
      adminApi.getPost(id).then((p: PostFull) => {
        setForm({ slug: p.slug, tag: p.tag, title_en: p.title_en, title_fr: p.title_fr, excerpt_en: p.excerpt_en, excerpt_fr: p.excerpt_fr, body_en: p.body_en, body_fr: p.body_fr, published: !!p.published });
        setLoaded(true);
      });
    }
  }, [id]);
  const set = (k: keyof PostInput, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const suggestSlug = () => set('slug', form.title_en.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120));
  async function save() {
    setSaving(true); setError(null);
    try {
      const res = id === null ? await adminApi.createPost(form) : await adminApi.updatePost(id, form);
      if (res.ok) onDone();
      else { const b = await res.json().catch(() => ({})); setError(b.error === 'slug_exists' ? t('admin.slugExists') : t('admin.saveError')); }
    } catch (e) { setError(e instanceof ApiError && e.status === 409 ? t('admin.slugExists') : t('admin.saveError')); } finally { setSaving(false); }
  }
  if (!loaded) return <p className="font-mono text-[.85rem] text-slate">{t('admin.loading')}</p>;
  const body = previewFr ? form.body_fr : form.body_en;
  return (
    <div>
      <button onClick={onDone} className="font-mono text-[.8rem] !text-cyan inline-flex items-center gap-2 before:content-['←'] mb-6">{t('admin.backToList')}</button>
      <div className="grid grid-cols-2 max-[900px]:grid-cols-1 gap-6">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div><label className={label}>{t('admin.fSlug')}</label>
              <input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="my-post-slug" className={field} /></div>
            <button type="button" onClick={suggestSlug} className="font-mono text-[.74rem] px-3 py-[11px] neu-btn text-paper-dim hover:text-cyan whitespace-nowrap">{t('admin.autoSlug')}</button>
          </div>
          <div><label className={label}>{t('admin.fTag')}</label>
            <input value={form.tag} onChange={(e) => set('tag', e.target.value)} placeholder="Advisory" className={field} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>{t('admin.fTitleEn')}</label><input value={form.title_en} onChange={(e) => set('title_en', e.target.value)} className={field} /></div>
            <div><label className={label}>{t('admin.fTitleFr')}</label><input value={form.title_fr} onChange={(e) => set('title_fr', e.target.value)} className={field} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>{t('admin.fExcerptEn')}</label><textarea value={form.excerpt_en} onChange={(e) => set('excerpt_en', e.target.value)} className={`${field} min-h-[70px] resize-y`} /></div>
            <div><label className={label}>{t('admin.fExcerptFr')}</label><textarea value={form.excerpt_fr} onChange={(e) => set('excerpt_fr', e.target.value)} className={`${field} min-h-[70px] resize-y`} /></div>
          </div>
          <div><label className={label}>{t('admin.fBodyEn')} · Markdown</label><textarea value={form.body_en} onChange={(e) => set('body_en', e.target.value)} className={`${field} min-h-[200px] resize-y font-mono !text-[.85rem]`} /></div>
          <div><label className={label}>{t('admin.fBodyFr')} · Markdown</label><textarea value={form.body_fr} onChange={(e) => set('body_fr', e.target.value)} className={`${field} min-h-[200px] resize-y font-mono !text-[.85rem]`} /></div>
          <label className="flex items-center gap-3 font-mono text-[.82rem] text-paper-dim cursor-pointer">
            <input type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)} className="w-4 h-4 accent-cyan" />{t('admin.publishNow')}</label>
          {error && <span className="font-mono text-[.78rem] text-termred" role="alert">{error}</span>}
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="btn btn-primary neu-btn justify-center disabled:opacity-50">{saving ? t('admin.saving') : t('admin.save')}</button>
            <button onClick={onDone} className="btn btn-ghost neu-btn">{t('admin.cancel')}</button>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="mini-mono text-teal">// {t('admin.preview')}</span>
            <div className="flex neu-inset p-1 rounded-brand text-[.72rem] font-mono">
              <button onClick={() => setPreviewFr(false)} className={`px-2.5 py-1 rounded ${!previewFr ? 'bg-cyan text-ink' : 'text-paper-dim'}`}>EN</button>
              <button onClick={() => setPreviewFr(true)} className={`px-2.5 py-1 rounded ${previewFr ? 'bg-cyan text-ink' : 'text-paper-dim'}`}>FR</button>
            </div>
          </div>
          <div className="neu p-6 min-h-[300px]">
            <h3 className="font-display font-bold text-[1.4rem] mb-3">{(previewFr ? form.title_fr : form.title_en) || t('admin.untitled')}</h3>
            <div className="prose-skelion !text-[.92rem]" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmissionsList() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Submission[] | null>(null);
  const load = useCallback(() => { adminApi.submissions(200).then((d) => setItems(d.items)).catch(() => setItems([])); }, []);
  useEffect(load, [load]);
  return (
    <div>
      <h2 className="font-display font-semibold text-[1.3rem] mb-5">{t('admin.submissions')}</h2>
      {items !== null && items.length === 0 && <p className="font-mono text-[.85rem] text-slate">{t('admin.empty')}</p>}
      <div className="flex flex-col gap-3">
        {items?.map((s) => (
          <article key={s.id} className="neu p-6 grid grid-cols-[1fr_auto] max-[760px]:grid-cols-1 gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <span className={`font-mono text-[.66rem] tracking-[.12em] px-2 py-[3px] rounded font-medium ${s.handled ? 'bg-teal text-ink' : 'bg-cyan text-ink'}`}>{s.handled ? t('admin.statusHandled') : t('admin.statusNew')}</span>
                <b className="font-display text-[1.02rem]">{s.name}</b>
                {s.organization && <span className="text-paper-dim text-[.88rem]">· {s.organization}</span>}
                <span className="mini-mono">#{s.id} · {s.locale.toUpperCase()} · {s.created_at}Z</span>
              </div>
              <div className="font-mono text-[.8rem] text-cyan mb-1 break-all">{s.email}</div>
              {s.service && <div className="text-paper-dim text-[.85rem] mb-2">{s.service}</div>}
              {s.message && <p className="text-paper-dim text-[.9rem] whitespace-pre-wrap break-words">{s.message}</p>}
            </div>
            <div className="flex flex-col max-[760px]:flex-row gap-2 items-end max-[760px]:items-center shrink-0">
              <button onClick={async () => { await adminApi.setSubmissionHandled(s.id, !s.handled); load(); }} className="font-mono text-[.76rem] px-3.5 py-2 neu-btn text-paper-dim hover:text-teal">{s.handled ? t('admin.markNew') : t('admin.markHandled')}</button>
              <button onClick={async () => { if (window.confirm(t('admin.delConfirm'))) { await adminApi.deleteSubmission(s.id); load(); } }} className="font-mono text-[.76rem] px-3.5 py-2 neu-btn text-paper-dim hover:text-termred">{t('admin.del')}</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function SubscribersList() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Subscriber[] | null>(null);
  const load = useCallback(() => { adminApi.subscribers().then((d) => setItems(d.items)).catch(() => setItems([])); }, []);
  useEffect(load, [load]);
  const exportCsv = () => {
    if (!items?.length) return;
    const rows = [['email', 'locale', 'created_at'], ...items.map((s) => [s.email, s.locale, s.created_at])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'skelion-subscribers.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div>
      <div className="flex justify-between items-center mb-5 gap-4 flex-wrap">
        <h2 className="font-display font-semibold text-[1.3rem]">{t('admin.subscribersTitle')}</h2>
        {!!items?.length && <button onClick={exportCsv} className="btn btn-ghost neu-btn !py-[9px] !px-[18px] !text-[.8rem]">{t('admin.exportCsv')}</button>}
      </div>
      {items !== null && items.length === 0 && <p className="font-mono text-[.85rem] text-slate">{t('admin.noSubs')}</p>}
      <div className="flex flex-col gap-2.5">
        {items?.map((s) => (
          <div key={s.id} className="neu px-5 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0"><span className="font-mono text-[.85rem] text-cyan break-all">{s.email}</span><span className="mini-mono ml-3">{s.locale.toUpperCase()} · {s.created_at}Z</span></div>
            <button onClick={async () => { if (window.confirm(t('admin.delSubConfirm'))) { await adminApi.deleteSubscriber(s.id); load(); } }} className="font-mono text-[.74rem] px-3 py-1.5 neu-btn text-paper-dim hover:text-termred shrink-0">{t('admin.del')}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
