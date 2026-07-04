import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';
import { useReveal } from '../lib/useReveal';
import PageHeader from '../components/pages/PageHeader';
import CtaBand from '../components/pages/CtaBand';

interface QA { q: string; a: string }

export default function Faq() {
  const { t } = useTranslation();
  useSeo({ title: t('faq.seoTitle'), description: t('faq.seoDesc'), path: '/faq' });
  useReveal();
  const items = t('faq.items', { returnObjects: true }) as QA[];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <PageHeader cmd={t('faq.cmd')} sub={t('faq.sub')}>
        {t('faq.titleA')}<span className="text-cyan">{t('faq.titleAccent')}</span>
      </PageHeader>

      <section className="pb-[104px] max-[640px]:pb-[74px]">
        <div className="wrap max-w-[820px]">
          <ul className="flex flex-col gap-3.5">
            {items.map((qa, i) => {
              const isOpen = open === i;
              return (
                <li key={i} className="neu overflow-hidden reveal">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                  >
                    <span className="font-display font-semibold text-[1.04rem] !text-paper">{qa.q}</span>
                    <span className={`font-mono text-cyan text-lg shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} aria-hidden="true">
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 -mt-1">
                      <p className="text-paper-dim text-[.94rem] leading-relaxed border-t border-soft pt-4">{qa.a}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <CtaBand title={t('faq.ctaTitle')} desc={t('faq.ctaDesc')} cta={t('faq.cta')} />
    </>
  );
}
