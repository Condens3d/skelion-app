import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';
import { portalApi, PortalEngagement, Finding, ApiError } from '../lib/api';
import { renderMarkdown } from '../lib/mdRender';
import PageHeader from '../components/pages/PageHeader';

/**
 * Client portal. Separate session from the admin console (own cookie, own JWT
 * audience). Clients see only their organization's engagements and findings.
 */

const SEV_CLS: Record<string, string> = {
  critical: 'bg-termred/15 text-termred border-termred/40',
  high: 'bg-termred/10 text-termred border-termred/25',
  medium: 'bg-termamber/10 text-termamber border-termamber/30',
  low: 'bg-teal/10 text-teal border-teal/30',
  info: 'bg-ink-3 text-paper-dim border-soft',
};

function SevBadge({ sev, label }: { sev: string; label: string }) {
  return <span className={`font-mono text-[.68rem] tracking-[.06em] uppercase border rounded px-2 py-[3px] ${SEV_CLS[sev] || SEV_CLS.info}`}>{label}</span>;
}

export default function Portal() {
  const { t } = useTranslation();
  useSeo({ title: t('portal.seoTitle'), description: t('portal.seoDesc'), path: '/portal', noindex: true });

  const [me, setMe] = useState<{ email: string; name: string } | null | undefined>(undefined);
  useEffect(() => { portalApi.me().then(setMe); }, []);

  if (me === undefined) return <div className="max-w-[880px] mx-auto px-7 py-24 font-mono text-paper-dim">{t('portal.loading')}</div>;
  return me ? <Workspace me={me} onLogout={() => setMe(null)} /> : <Login onIn={setMe} />;
}

function Login({ onIn }: { onIn: (m: { email: string; name: string }) => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr('');
    const fd = new FormData(e.currentTarget);
    try {
      const r = await portalApi.login(String(fd.get('email')), String(fd.get('password')));
      onIn({ email: r.email, name: r.name });
    } catch (ex) {
      setErr(ex instanceof ApiError && ex.status === 429 ? t('portal.rateLimited') : t('portal.badCreds'));
    } finally { setBusy(false); }
  }
  const field = 'w-full bg-ink border border-soft rounded-brand text-paper font-body text-[.94rem] px-[15px] py-[13px] focus:border-cyan focus:outline-none';
  return (
    <>
      <PageHeader cmd={t('portal.cmd')} sub={t('portal.sub')}>
        {t('portal.titleA')}<span className="text-cyan">{t('portal.titleB')}</span>
      </PageHeader>
      <section className="max-w-[460px] mx-auto px-7 pb-24">
        <form onSubmit={submit} className="neu neu-raised rounded-panel p-8 grid gap-4">
          <label className="grid gap-1.5">
            <span className="font-mono text-[.75rem] text-paper-dim">{t('portal.email')}</span>
            <input name="email" type="email" required autoComplete="username" className={field} />
          </label>
          <label className="grid gap-1.5">
            <span className="font-mono text-[.75rem] text-paper-dim">{t('portal.password')}</span>
            <input name="password" type="password" required autoComplete="current-password" className={field} />
          </label>
          {err && <p className="font-mono text-[.8rem] text-termred" role="alert">{err}</p>}
          <button className="btn btn-primary disabled:opacity-50" disabled={busy}>{busy ? t('portal.signingIn') : t('portal.signIn')}</button>
          <p className="font-mono text-[.72rem] text-paper-dim">{t('portal.noAccount')}</p>
        </form>
      </section>
    </>
  );
}

function Workspace({ me, onLogout }: { me: { email: string; name: string }; onLogout: () => void }) {
  const { t } = useTranslation();
  const [engs, setEngs] = useState<PortalEngagement[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  useEffect(() => { portalApi.engagements().then((r) => setEngs(r.items)).catch(() => setEngs([])); }, []);
  async function logout() { await portalApi.logout(); onLogout(); }

  return (
    <>
      <PageHeader cmd={t('portal.cmd')} sub={t('portal.wsSub')}>
        {t('portal.wsTitle')}<span className="text-cyan">{me.name || me.email}</span>
      </PageHeader>
      <section className="max-w-[980px] mx-auto px-7 pb-24">
        <div className="flex justify-between items-center gap-4 flex-wrap mb-7 font-mono text-[.8rem]">
          <span className="text-slate">{t('portal.signedInAs')}: <span className="text-teal">{me.email}</span></span>
          <span className="flex gap-3">
            <button onClick={() => setPwOpen(!pwOpen)} className="btn btn-ghost neu-btn !py-[9px] !px-[18px] !text-[.8rem]">{t('portal.changePw')}</button>
            <button onClick={logout} className="btn btn-ghost neu-btn !py-[9px] !px-[18px] !text-[.8rem]">{t('portal.signOut')}</button>
          </span>
        </div>

        {pwOpen && <PasswordForm onDone={() => setPwOpen(false)} />}

        {engs === null && <p className="font-mono text-paper-dim">{t('portal.loading')}</p>}
        {engs?.length === 0 && (
          <div className="neu neu-inset rounded-panel p-9 text-center text-paper-dim">{t('portal.noEngagements')}</div>
        )}

        <div className="grid gap-5">
          {engs?.map((e) => (
            <div key={e.id} className="neu neu-raised rounded-panel p-7">
              <button className="w-full text-left" onClick={() => setOpen(open === e.id ? null : e.id)}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
                  <span className="font-mono text-[.72rem] text-cyan">SKL-E-{String(e.id).padStart(4, '0')}</span>
                  <span className="font-mono text-[.72rem] text-paper-dim uppercase tracking-[.06em]">{t(`portal.types.${e.type}`)}</span>
                  <span className="font-mono text-[.72rem] px-2 py-[3px] rounded border border-soft text-paper-dim uppercase tracking-[.06em]">{t(`portal.statuses.${e.status}`)}</span>
                  <span className="ml-auto font-mono text-[.72rem] text-paper-dim">
                    {e.findings_open}/{e.findings_total} {t('portal.openFindings')}
                  </span>
                </div>
                <h2 className="font-display text-[1.25rem] text-paper font-semibold">{e.title}</h2>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {(['critical', 'high', 'medium', 'low', 'info'] as const).map((sv) =>
                    e.severity_counts[sv] > 0 ? <SevBadge key={sv} sev={sv} label={`${e.severity_counts[sv]} ${t(`portal.sev.${sv}`)}`} /> : null
                  )}
                </div>
              </button>
              {open === e.id && <EngagementDetail id={e.id} />}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setMsg(null);
    try {
      await portalApi.changePassword(String(fd.get('current')), String(fd.get('next')));
      setMsg({ ok: true, text: t('portal.pwChanged') });
      setTimeout(onDone, 1600);
    } catch (ex) {
      setMsg({ ok: false, text: ex instanceof ApiError && ex.status === 400 ? t('portal.pwTooShort') : t('portal.pwWrong') });
    } finally { setBusy(false); }
  }
  const field = 'w-full bg-ink border border-soft rounded-brand text-paper font-body text-[.9rem] px-[14px] py-[11px] focus:border-cyan focus:outline-none';
  return (
    <form onSubmit={submit} className="neu neu-inset rounded-panel p-6 grid gap-3 mb-7 sm:grid-cols-3 sm:items-end">
      <label className="grid gap-1.5">
        <span className="font-mono text-[.72rem] text-paper-dim">{t('portal.pwCurrent')}</span>
        <input name="current" type="password" required autoComplete="current-password" className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className="font-mono text-[.72rem] text-paper-dim">{t('portal.pwNew')}</span>
        <input name="next" type="password" required minLength={12} autoComplete="new-password" className={field} />
      </label>
      <button className="btn btn-primary disabled:opacity-50" disabled={busy}>{busy ? '...' : t('portal.pwSubmit')}</button>
      {msg && <p className={`sm:col-span-3 font-mono text-[.78rem] ${msg.ok ? 'text-teal' : 'text-termred'}`} role="status">{msg.text}</p>}
    </form>
  );
}

function EngagementDetail({ id }: { id: number }) {
  const { t } = useTranslation();
  const [data, setData] = useState<{ summary: string; findings: Finding[] } | null>(null);
  const [openF, setOpenF] = useState<number | null>(null);
  useEffect(() => { portalApi.engagement(id).then(setData).catch(() => setData(null)); }, [id]);
  if (!data) return <p className="mt-5 font-mono text-[.8rem] text-paper-dim">{t('portal.loading')}</p>;
  return (
    <div className="mt-6 pt-6 border-t border-soft">
      {data.summary && (
        <div className="prose-skelion mb-6" dangerouslySetInnerHTML={{ __html: renderMarkdown(data.summary) }} />
      )}
      <h3 className="font-mono text-[.78rem] text-cyan tracking-[.08em] mb-4">&gt; {t('portal.findings')}</h3>
      {data.findings.length === 0 && <p className="text-paper-dim text-[.9rem]">{t('portal.noFindings')}</p>}
      <div className="grid gap-3">
        {data.findings.map((f) => (
          <div key={f.id} className="neu p-5">
            <button className="w-full text-left flex flex-wrap items-center gap-3" onClick={() => setOpenF(openF === f.id ? null : f.id)}>
              <SevBadge sev={f.severity} label={t(`portal.sev.${f.severity}`)} />
              {f.cvss != null && <span className="font-mono text-[.72rem] text-paper-dim">CVSS {Number(f.cvss).toFixed(1)}</span>}
              <span className="text-paper text-[.95rem] font-medium">{f.title}</span>
              <span className="ml-auto font-mono text-[.7rem] px-2 py-[3px] rounded border border-soft text-paper-dim uppercase tracking-[.05em]">{t(`portal.fstatus.${f.status}`)}</span>
            </button>
            {openF === f.id && (
              <div className="mt-4 pt-4 border-t border-soft grid gap-4">
                {f.description && <Block label={t('portal.fDesc')} md={f.description} />}
                {f.impact && <Block label={t('portal.fImpact')} md={f.impact} />}
                {f.remediation && <Block label={t('portal.fRemediation')} md={f.remediation} />}
                <div className="font-mono text-[.7rem] text-paper-dim">
                  {t('portal.fOpened')} {new Date(f.created_at).toLocaleDateString()}
                  {f.resolved_at ? ` · ${t('portal.fResolved')} ${new Date(f.resolved_at).toLocaleDateString()}` : ''}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Block({ label, md }: { label: string; md: string }) {
  return (
    <div>
      <div className="font-mono text-[.7rem] text-slate uppercase tracking-[.08em] mb-1.5">{label}</div>
      <div className="prose-skelion text-[.92rem]" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
    </div>
  );
}
