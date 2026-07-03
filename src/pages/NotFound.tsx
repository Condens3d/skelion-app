import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';

/** Ported from reference/site/404.html: terminal window, error output, return_home. */
export default function NotFound() {
  const { t } = useTranslation();
  useSeo({ title: t('pages.notFound.seoTitle'), description: '', path: '/404', noindex: true });
  return (
    <div className="min-h-screen flex items-center justify-center p-6 pt-[90px]">
      <div className="w-full max-w-[640px] bg-ink-2 border border-soft rounded-panel overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,.55)]">
        <div className="flex gap-2 items-center px-4 py-3 bg-ink-3 border-b border-soft">
          <span className="w-[11px] h-[11px] rounded-full bg-termred" />
          <span className="w-[11px] h-[11px] rounded-full bg-termamber" />
          <span className="w-[11px] h-[11px] rounded-full bg-termgreen" />
          <span className="ml-2.5 text-paper-dim text-[.76rem] font-mono">{t('pages.notFound.termTitle')}</span>
        </div>
        <div className="px-7 py-[30px] font-mono text-[.9rem] leading-loose">
          <div><span className="text-cyan">$</span> {t('pages.notFound.l1').slice(2)}</div>
          <div className="text-paper-dim">{t('pages.notFound.l2')}</div>
          <div className="text-termred">{t('pages.notFound.l3')}</div>
          <div className="text-termamber">{t('pages.notFound.l4')}</div>
          <h1 className="font-display text-[clamp(2.4rem,7vw,3.6rem)] tracking-[-.03em] my-3.5 mb-1.5 text-paper font-bold">404</h1>
          <div className="text-paper-dim">{t('pages.notFound.comment')}</div>
          <div className="mt-3.5">
            <span className="text-cyan">$</span> {t('pages.notFound.cdHome').slice(2)}{' '}
            <span className="inline-block w-[9px] h-4 bg-teal align-[-2px] animate-blink-fast" aria-hidden="true" />
          </div>
          <Link
            to="/"
            className="inline-block mt-[22px] px-[26px] py-[13px] rounded-brand bg-cyan !text-ink font-medium text-[.88rem] transition-colors hover:bg-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal focus-visible:outline-offset-[3px]"
          >
            {t('pages.notFound.btn')}
          </Link>
        </div>
      </div>
    </div>
  );
}
