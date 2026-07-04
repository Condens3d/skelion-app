import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const KEY = 'skelion-consent';

/**
 * Privacy-first notice. The platform sets no tracking or analytics cookies by
 * default (only a functional language preference), so this is an honest,
 * cookieless-friendly acknowledgement rather than a consent gate.
 */
export default function CookieConsent() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* storage blocked; do not nag */
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  if (!show) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-[90] max-w-[560px] mx-auto neu-raised p-5 flex items-center gap-4 max-[560px]:flex-col max-[560px]:items-start" role="region" aria-label={t('consent.aria')}>
      <p className="text-paper-dim text-[.85rem] flex-1">{t('consent.text')}</p>
      <button onClick={dismiss} className="btn btn-primary neu-btn !py-[10px] !px-[20px] !text-[.8rem] shrink-0">
        {t('consent.ok')}
      </button>
    </div>
  );
}
