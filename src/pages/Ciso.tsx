import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';
import { useReveal } from '../lib/useReveal';
import PageHeader from '../components/pages/PageHeader';
import StepStrip, { Step } from '../components/pages/StepStrip';
import SectionHead from '../components/pages/SectionHead';
import CtaBand from '../components/pages/CtaBand';

interface Model { tag: string; title: string; desc: string; fit: string }

export default function Ciso() {
  const { t } = useTranslation();
  useSeo({ title: t('pages.ciso.seoTitle'), description: t('pages.ciso.seoDesc'), path: '/ciso' });
  useReveal();
  const models = t('pages.ciso.models', { returnObjects: true }) as Model[];
  const mandate = t('pages.ciso.mandate', { returnObjects: true }) as string[];
  const first = t('pages.ciso.first', { returnObjects: true }) as Step[];

  return (
    <>
      <PageHeader cmd={t('pages.ciso.cmd')} sub={t('pages.ciso.sub')}>
        {t('pages.ciso.titleA')}
        <span className="text-teal">{t('pages.ciso.titleAccent')}</span>
      </PageHeader>

      <section className="pb-[104px] max-[640px]:pb-[74px]">
        <div className="wrap">
          <SectionHead cmd={t('pages.ciso.modelsCmd')} title={t('pages.ciso.modelsTitle')} />
          <div className="grid grid-cols-3 max-[1024px]:grid-cols-1 gap-[22px] mt-12">
            {models.map((m) => (
              <div key={m.tag} className="reveal flex flex-col bg-ink-2 border border-soft rounded-panel px-7 py-8 transition-all duration-[220ms] hover:border-cyan/45 hover:bg-ink-3">
                <span className="font-mono text-[.74rem] text-cyan tracking-[.1em] mb-4">{m.tag}</span>
                <h3 className="font-display font-semibold text-[1.22rem] mb-3">{m.title}</h3>
                <p className="text-paper-dim text-[.92rem] flex-1">{m.desc}</p>
                <span className="mini-mono block mt-5 text-teal">{m.fit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[104px] max-[640px]:py-[74px] bg-ink-2 border-y border-soft">
        <div className="wrap grid grid-cols-[1fr_1fr] max-[1024px]:grid-cols-1 gap-14 items-start">
          <div>
            <span className="mini-mono text-teal reveal block">{t('pages.ciso.mandateKicker')}</span>
            <h2 className="h2-display reveal mt-2">{t('pages.ciso.mandateTitle')}</h2>
          </div>
          <div className="grid grid-cols-2 max-[640px]:grid-cols-1 gap-x-10">
            <ul className="checklist">
              {mandate.slice(0, 4).map((m) => (
                <li key={m} className="reveal">{m}</li>
              ))}
            </ul>
            <ul className="checklist">
              {mandate.slice(4).map((m) => (
                <li key={m} className="reveal">{m}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-[104px] max-[640px]:py-[74px]">
        <div className="wrap">
          <SectionHead cmd={t('pages.ciso.firstCmd')} title={t('pages.ciso.firstTitle')} />
          <StepStrip steps={first} cols={3} />
        </div>
      </section>

      <CtaBand title={t('pages.ciso.ctaTitle')} desc={t('pages.ciso.ctaDesc')} cta={t('pages.ciso.cta')} />
    </>
  );
}
