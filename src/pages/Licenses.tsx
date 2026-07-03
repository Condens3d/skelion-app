import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';
import { useReveal } from '../lib/useReveal';
import PageHeader from '../components/pages/PageHeader';
import StepStrip, { Step } from '../components/pages/StepStrip';
import SectionHead from '../components/pages/SectionHead';
import CtaBand from '../components/pages/CtaBand';

interface Vendor { name: string; cat: string }

export default function Licenses() {
  const { t } = useTranslation();
  useSeo({ title: t('pages.licenses.seoTitle'), description: t('pages.licenses.seoDesc'), path: '/licenses' });
  useReveal();
  const vendors = t('pages.licenses.vendors', { returnObjects: true }) as Vendor[];
  const process = t('pages.licenses.process', { returnObjects: true }) as Step[];
  const why = t('pages.licenses.why', { returnObjects: true }) as string[];

  return (
    <>
      <PageHeader cmd={t('pages.licenses.cmd')} sub={t('pages.licenses.sub')}>
        {t('pages.licenses.titleA')}
        <span className="text-teal">{t('pages.licenses.titleAccent')}</span>
      </PageHeader>

      <section className="pb-[104px] max-[640px]:pb-[74px]">
        <div className="wrap">
          <SectionHead title={t('pages.licenses.vendorsTitle')} />
          <div className="grid grid-cols-4 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1 gap-[18px] mt-12">
            {vendors.map((v) => (
              <div key={v.name} className="reveal bg-ink-2 border border-soft rounded-panel px-[22px] py-[30px] text-center transition-all duration-[220ms] hover:border-teal/40 hover:-translate-y-[3px]">
                <b className="font-display font-semibold text-[1.12rem] block mb-1.5">{v.name}</b>
                <span className="font-mono text-[.72rem] text-slate tracking-[.08em] uppercase">{v.cat}</span>
              </div>
            ))}
            <div className="reveal bg-ink-2 border border-dashed border-soft rounded-panel px-[22px] py-[30px] text-center transition-all duration-[220ms] hover:border-teal/40 hover:-translate-y-[3px]">
              <b className="font-display font-semibold text-[1.12rem] block mb-1.5 text-cyan">{t('pages.licenses.moreName')}</b>
              <span className="font-mono text-[.72rem] text-slate tracking-[.08em] uppercase">{t('pages.licenses.moreCat')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-[104px] max-[640px]:py-[74px] bg-ink-2 border-y border-soft">
        <div className="wrap">
          <SectionHead cmd={t('pages.licenses.processCmd')} title={t('pages.licenses.processTitle')} />
          <StepStrip steps={process} />
        </div>
      </section>

      <section className="py-[104px] max-[640px]:py-[74px]">
        <div className="wrap grid grid-cols-[1fr_1fr] max-[1024px]:grid-cols-1 gap-14 items-start">
          <div>
            <span className="mini-mono text-teal reveal block">{t('pages.licenses.whyKicker')}</span>
            <h2 className="h2-display reveal mt-2">{t('pages.licenses.whyTitle')}</h2>
          </div>
          <ul className="checklist">
            {why.map((w) => (
              <li key={w} className="reveal">{w}</li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand title={t('pages.licenses.ctaTitle')} desc={t('pages.licenses.ctaDesc')} cta={t('pages.licenses.cta')} />
    </>
  );
}
