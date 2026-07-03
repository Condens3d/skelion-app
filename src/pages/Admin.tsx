import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';

interface Submission {
  id: number;
  name: string;
  organization: string;
  email: string;
  service: string;
  message: string;
  locale: string;
  created_at: string;
  handled: 0 | 1;
  handled_at: string | null;
}

type Session = { checking: boolean; email: string | null };

const field =
  'w-full bg-ink border border-soft rounded-brand text-paper font-body text-[.94rem] px-[15px] py-[13px] transition-colors focus:border-cyan focus:outline-none';
const label = 'font-mono text-[.74rem] text-paper-dim tracking-[.1em] uppercase block mb-[7px]';

export default function Admin() {
  const { t } = useTranslation();
  useSeo({ title: t('admin.seoTitle'), description: '', path: '/admin', noindex: true });

  const [session, setSession] = useState<Session>({ checking: true, email: null });

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSession({ checking: false, email: d?.email ?? null }))
      .catch(() => setSession({ checking: false, email: null }));
  }, []);

  if (session.checking) {
    return (
      <div className="pt-[150px] pb-24 wrap font-mono text-paper-dim text-[.9rem]">
        <span className="text-cyan">$</span> whoami <span className="inline-block w-2 h-4 bg-teal align-[-2px] animate-blink-fast" />
      </div>
    );
  }

  return (
    <section className="pt-[130px] pb-24 min-h-screen">
      <div className="wrap">
        <div className="cmd">{t('admin.cmd')}</div>
        <h1 className="h2-display">{t('admin.title')}</h1>
        {session.email ? (
          <Dashboard email={session.email} onLogout={() => setSession({ checking: false, email: null })} />
        ) : (
          <Login onAuth={(email) => setSession({ checking: false, email })} />
        )}
      </div>
    </section>
  );
}

function Login({ onAuth }: { onAuth: (email: string) => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const d = await res.json();
        onAuth(d.email);
      } else if (res.status === 429) {
        setError(t('admin.rateLimited'));
      } else {
        setError(t('admin.loginFailed'));
      }
    } catch {
      setError(t('admin.serverDown'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel-card p-9 max-w-[420px] mt-10 flex flex-col gap-[18px]">
      <span className="mini-mono text-teal">{`// ${t('admin.loginTitle').toUpperCase()}`}</span>
      <div>
        <label htmlFor="a-email" className={label}>{t('admin.email')}</label>
        <input id="a-email" name="email" type="email" required autoComplete="username" className={field} />
      </div>
      <div>
        <label htmlFor="a-pass" className={label}>{t('admin.password')}</label>
        <input id="a-pass" name="password" type="password" required autoComplete="current-password" className={field} />
      </div>
      <button type="submit" disabled={busy} className="btn btn-primary justify-center disabled:opacity-50">
        {busy ? t('admin.loginBusy') : t('admin.loginBtn')}
      </button>
      {error && <span className="font-mono text-[.78rem] text-termred" role="alert">{error}</span>}
    </form>
  );
}

function Dashboard({ email, onLogout }: { email: string; onLogout: () => void }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/submissions?limit=200')
      .then((r) => {
        if (r.status === 401) { onLogout(); return null; }
        return r.ok ? r.json() : Promise.reject();
      })
      .then((d) => { if (d) { setItems(d.items); setTotal(d.total); } })
      .catch(() => setError(t('admin.serverDown')));
  }, [onLogout, t]);

  useEffect(load, [load]);

  async function setHandled(id: number, handled: boolean) {
    await fetch(`/api/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handled }),
    });
    load();
  }

  async function remove(id: number) {
    if (!window.confirm(t('admin.delConfirm'))) return;
    await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
    load();
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    onLogout();
  }

  return (
    <div className="mt-9">
      <div className="flex justify-between items-center gap-4 flex-wrap mb-6 font-mono text-[.8rem]">
        <span className="text-paper-dim">
          {t('admin.loggedInAs')}: <span className="text-teal">{email}</span> · {total} {t('admin.total')}
        </span>
        <button onClick={logout} className="btn btn-ghost !py-[9px] !px-[18px] !text-[.8rem]">{t('admin.logout')}</button>
      </div>
      <h2 className="font-display font-semibold text-[1.3rem] mb-5">{t('admin.submissions')}</h2>
      {error && <p className="font-mono text-[.8rem] text-termred mb-4">{error}</p>}
      {items.length === 0 && !error && <p className="font-mono text-[.85rem] text-paper-dim">{t('admin.empty')}</p>}
      <div className="flex flex-col gap-4">
        {items.map((s) => (
          <article key={s.id} className="panel-card p-6 grid grid-cols-[1fr_auto] max-[760px]:grid-cols-1 gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <span className={`font-mono text-[.68rem] tracking-[.12em] px-2 py-[3px] rounded font-medium ${s.handled ? 'bg-teal text-ink' : 'bg-cyan text-ink'}`}>
                  {s.handled ? t('admin.statusHandled') : t('admin.statusNew')}
                </span>
                <b className="font-display text-[1.02rem]">{s.name}</b>
                {s.organization && <span className="text-paper-dim text-[.88rem]">· {s.organization}</span>}
                <span className="mini-mono">#{s.id} · {s.locale.toUpperCase()} · {s.created_at}Z</span>
              </div>
              <div className="font-mono text-[.8rem] text-cyan mb-1 break-all">{s.email}</div>
              {s.service && <div className="text-paper-dim text-[.85rem] mb-2">{s.service}</div>}
              {s.message && <p className="text-paper-dim text-[.9rem] whitespace-pre-wrap break-words">{s.message}</p>}
            </div>
            <div className="flex flex-col max-[760px]:flex-row gap-2 items-end max-[760px]:items-center shrink-0">
              <button
                onClick={() => setHandled(s.id, !s.handled)}
                className="font-mono text-[.76rem] px-3.5 py-2 border border-soft rounded-brand text-paper-dim hover:border-teal hover:text-teal transition-colors"
              >
                {s.handled ? t('admin.markNew') : t('admin.markHandled')}
              </button>
              <button
                onClick={() => remove(s.id)}
                className="font-mono text-[.76rem] px-3.5 py-2 border border-soft rounded-brand text-paper-dim hover:border-termred hover:text-termred transition-colors"
              >
                {t('admin.del')}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
