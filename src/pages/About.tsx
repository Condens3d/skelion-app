import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';
import { useReveal } from '../lib/useReveal';
import PageHeader from '../components/pages/PageHeader';
import SectionHead from '../components/pages/SectionHead';
import CtaBand from '../components/pages/CtaBand';

interface Value { id: string; title: string; desc: string }

export default function About() {
  const { t } = useTranslation();
  useSeo({ title: t('about.seoTitle'), description: t('about.seoDesc'), path: '/about' });
  useReveal();
  const values = t('about.values', { returnObjects: true }) as Value[];
  const approach = t('about.approach', { returnObjects: true }) as string[];

  return (
    <>
      <PageHeader cmd={t('about.cmd')} sub={t('about.sub')}>
        {t('about.titleA')}<span className="text-cyan">{t('about.titleAccent')}</span>
      </PageHeader>

      <section className="pb-[104px] max-[640px]:pb-[74px]">
        <div className="wrap grid grid-cols-[1.1fr_.9fr] max-[1024px]:grid-cols-1 gap-14 items-start">
          <div>
            <SectionHead title={t('about.missionTitle')} />
            <p className="sub reveal !max-w-none mb-4">{t('about.missionA')}</p>
            <p className="text-paper-dim text-[.98rem] reveal">{t('about.missionB')}</p>
          </div>
          <div className="neu-raised p-8 reveal">
            <span className="mini-mono text-teal block mb-4">// {t('about.approachKicker')}</span>
            <ul className="checklist !my-0">
              {approach.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-[104px] max-[640px]:py-[74px] bg-ink-2 border-y border-soft">
        <div className="wrap">
          <SectionHead cmd={t('about.valuesCmd')} title={t('about.valuesTitle')} />
          <div className="grid grid-cols-3 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1 gap-[22px] mt-12">
            {values.map((v) => (
              <div key={v.id} className="neu neu-hover p-7 reveal">
                <b className="font-mono text-cyan text-[.78rem] tracking-[.1em] block mb-3">{v.id}</b>
                <h3 className="font-display font-semibold text-[1.14rem] mb-2 !text-paper">{v.title}</h3>
                <p className="text-paper-dim text-[.9rem]">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand title={t('about.ctaTitle')} desc={t('about.ctaDesc')} cta={t('about.cta')} />
    </>
  );
}
