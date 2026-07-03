import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';
import { useReveal } from '../lib/useReveal';
import PageHeader from '../components/pages/PageHeader';
import StepStrip, { Step } from '../components/pages/StepStrip';
import SectionHead from '../components/pages/SectionHead';
import CtaBand from '../components/pages/CtaBand';

interface Cat { ico: string; title: string; desc: string; points: string[] }

export default function Physical() {
  const { t } = useTranslation();
  useSeo({ title: t('pages.physical.seoTitle'), description: t('pages.physical.seoDesc'), path: '/physical' });
  useReveal();
  const cats = t('pages.physical.cats', { returnObjects: true }) as Cat[];
  const process = t('pages.physical.process', { returnObjects: true }) as Step[];
  const convergence = t('pages.physical.convergence', { returnObjects: true }) as string[];

  return (
    <>
      <PageHeader cmd={t('pages.physical.cmd')} sub={t('pages.physical.sub')}>
        {t('pages.physical.titleA')}
        <span className="text-teal">{t('pages.physical.titleAccent')}</span>
      </PageHeader>

      <section className="pb-[104px] max-[640px]:pb-[74px]">
        <div className="wrap">
          <SectionHead cmd={t('pages.physical.catCmd')} title={t('pages.physical.catTitle')} />
          <div className="grid grid-cols-2 max-[640px]:grid-cols-1 gap-[22px] mt-12">
            {cats.map((c) => (
              <div key={c.title} className="reveal bg-ink-2 border border-soft rounded-panel p-8 transition-all duration-[220ms] hover:border-teal/40">
                <span className="text-[1.5rem] mb-3.5 block text-teal" aria-hidden="true">{c.ico}</span>
                <h3 className="font-display font-semibold text-[1.18rem] mb-2">{c.title}</h3>
                <p className="text-paper-dim text-[.9rem] mb-4">{c.desc}</p>
                <ul className="checklist !my-0">
                  {c.points.map((p) => (
                    <li key={p} className="!text-[.84rem]">{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[104px] max-[640px]:py-[74px] bg-ink-2 border-y border-soft">
        <div className="wrap">
          <SectionHead cmd={t('pages.physical.processCmd')} title={t('pages.physical.processTitle')} />
          <StepStrip steps={process} />
        </div>
      </section>

      <section className="py-[104px] max-[640px]:py-[74px]">
        <div className="wrap grid grid-cols-[1fr_1fr] max-[1024px]:grid-cols-1 gap-14 items-start">
          <div>
            <span className="mini-mono text-teal reveal block">{t('pages.physical.convergenceKicker')}</span>
            <h2 className="h2-display reveal mt-2">{t('pages.physical.convergenceTitle')}</h2>
          </div>
          <ul className="checklist">
            {convergence.map((c) => (
              <li key={c} className="reveal">{c}</li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand title={t('pages.physical.ctaTitle')} desc={t('pages.physical.ctaDesc')} cta={t('pages.physical.cta')} />
    </>
  );
}
