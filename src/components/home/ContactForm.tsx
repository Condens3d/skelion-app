import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Status = 'idle' | 'sending' | 'sent' | 'failed';

/**
 * Terminal-styled contact form.
 * Posts to the built-in API (/api/contact) by default; VITE_FORM_ENDPOINT
 * overrides it for static-only deployments (Formspree/Web3Forms compatible).
 * Never fakes success: server errors and unreachable backends surface honestly.
 */
export default function ContactForm() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<Status>('idle');
  const endpoint = (import.meta.env.VITE_FORM_ENDPOINT as string | undefined) || '/api/contact';
  const options = t('contact.svcOptions', { returnObjects: true }) as string[];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending') return;
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    data.locale = i18n.resolvedLanguage === 'fr' ? 'fr' : 'en';
    setStatus('sending');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setStatus('sent');
        form.reset();
      } else {
        setStatus('failed');
      }
    } catch {
      setStatus('failed');
    }
  }

  const label = 'font-mono text-[.74rem] text-slate tracking-[.1em] uppercase block mb-[7px]';
  const field =
    'w-full bg-ink border border-soft rounded-brand text-paper font-body text-[.94rem] px-[15px] py-[13px] transition-colors focus:border-cyan focus:outline-none';

  const buttonText =
    status === 'sending' ? t('contact.sending') : status === 'sent' ? t('contact.sent') : t('contact.submit');

  return (
    <form className="reveal panel-card p-9 flex flex-col gap-[18px]" onSubmit={onSubmit}>
      <div>
        <label htmlFor="f-name" className={label}>{t('contact.fName')}</label>
        <input id="f-name" name="name" type="text" placeholder={t('contact.fNamePh')} required className={field} />
      </div>
      <div>
        <label htmlFor="f-org" className={label}>{t('contact.fOrg')}</label>
        <input id="f-org" name="organization" type="text" placeholder={t('contact.fOrgPh')} className={field} />
      </div>
      <div>
        <label htmlFor="f-mail" className={label}>{t('contact.fMail')}</label>
        <input id="f-mail" name="email" type="email" placeholder={t('contact.fMailPh')} required className={field} />
      </div>
      <div>
        <label htmlFor="f-svc" className={label}>{t('contact.fSvc')}</label>
        <select id="f-svc" name="service" className={field}>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-msg" className={label}>{t('contact.fMsg')}</label>
        <textarea id="f-msg" name="message" placeholder={t('contact.fMsgPh')} className={`${field} min-h-[120px] resize-y`} />
      </div>
      {/* Honeypot: hidden from humans, tempting to bots */}
      <div className="absolute -left-[9999px] top-0 h-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="f-web">Website</label>
        <input id="f-web" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <button
        type="submit"
        disabled={status === 'sending'}
        className="btn btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        aria-live="polite"
      >
        {buttonText}
      </button>
      {status === 'failed' && (
        <span className="font-mono text-[.78rem] text-termred" role="alert">{t('contact.failed')}</span>
      )}
      <span className="font-mono text-[.72rem] text-slate">{t('contact.note')}</span>
    </form>
  );
}
