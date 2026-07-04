import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

type S = 'idle' | 'sending' | 'ok' | 'error';

/** Newsletter capture. Posts to /api/v1/newsletter (idempotent, honeypot-guarded). */
export default function Newsletter() {
  const { t, i18n } = useTranslation();
  const [s, setS] = useState<S>('idle');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (s === 'sending') return;
    const form = e.currentTarget;
    const email = (new FormData(form).get('email') as string) || '';
    setS('sending');
    try {
      const res = await api.subscribe(email, i18n.resolvedLanguage === 'fr' ? 'fr' : 'en');
      if (res.ok) {
        setS('ok');
        form.reset();
      } else setS('error');
    } catch {
      setS('error');
    }
  }

  return (
    <div className="neu-raised p-9 max-[640px]:p-6 grid grid-cols-[1.2fr_1fr] max-[768px]:grid-cols-1 gap-8 items-center">
      <div>
        <span className="mini-mono text-teal block mb-2">// {t('newsletter.kicker')}</span>
        <h3 className="font-display font-semibold text-[1.4rem] mb-2 tracking-[-.01em]">{t('newsletter.title')}</h3>
        <p className="text-paper-dim text-[.93rem]">{t('newsletter.sub')}</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex gap-2 max-[420px]:flex-col">
          <input
            name="email"
            type="email"
            required
            placeholder={t('newsletter.placeholder')}
            aria-label={t('newsletter.placeholder')}
            className="flex-1 neu-inset text-paper font-body text-[.92rem] px-[15px] py-[13px] focus:outline-none border-0"
          />
          <button type="submit" disabled={s === 'sending'} className="btn btn-primary neu-btn justify-center disabled:opacity-50 whitespace-nowrap">
            {s === 'sending' ? t('newsletter.sending') : t('newsletter.cta')}
          </button>
        </div>
        {s === 'ok' && <span className="font-mono text-[.78rem] text-teal" role="status">{t('newsletter.ok')}</span>}
        {s === 'error' && <span className="font-mono text-[.78rem] text-termred" role="alert">{t('newsletter.error')}</span>}
        <span className="font-mono text-[.7rem] text-slate">{t('newsletter.note')}</span>
      </form>
    </div>
  );
}
