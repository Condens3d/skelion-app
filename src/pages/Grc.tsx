import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';
import { useReveal } from '../lib/useReveal';
import PageHeader from '../components/pages/PageHeader';
import StepStrip, { Step } from '../components/pages/StepStrip';
import SectionHead from '../components/pages/SectionHead';
import CtaBand from '../components/pages/CtaBand';

interface Framework { name: string; cat: string }

export default function Grc() {
  const { t } = useTranslation();
  useSeo({ title: t('pages.grc.seoTitle'), description: t('pages.grc.seoDesc'), path: '/grc' });
  useReveal();
  const phases = t('pages.grc.phases', { returnObjects: true }) as Step[];
  const frameworks = t('pages.grc.frameworks', { returnObjects: true }) as Framework[];
  const pointsA = t('pages.grc.trackAPoints', { returnObjects: true }) as string[];
  const pointsB = t('pages.grc.trackBPoints', { returnObjects: true }) as string[];

  return (
    <>
      <PageHeader cmd={t('pages.grc.cmd')} sub={t('pages.grc.sub')}>
        {t('pages.grc.titleA')}
        <span className="text-cyan">{t('pages.grc.titleAccent')}</span>
        {t('pages.grc.titleB')}
      </PageHeader>

      <section className="pb-[104px] max-[640px]:pb-[74px]">
        <div className="wrap">
          <SectionHead title={t('pages.grc.tracksTitle')} />
          <div className="grid grid-cols-2 max-[1024px]:grid-cols-1 gap-[22px] mt-12">
            <TrackCard tag={t('pages.grc.trackATag')} title={t('pages.grc.trackATitle')} desc={t('pages.grc.trackADesc')} points={pointsA} />
            <TrackCard tag={t('pages.grc.trackBTag')} title={t('pages.grc.trackBTitle')} desc={t('pages.grc.trackBDesc')} points={pointsB} />
          </div>
        </div>
      </section>

      <section className="py-[104px] max-[640px]:py-[74px] bg-ink-2 border-y border-soft">
        <div className="wrap">
          <SectionHead cmd={t('pages.grc.journeyCmd')} title={t('pages.grc.journeyTitle')} />
          <StepStrip steps={phases} />
        </div>
      </section>

      <section className="py-[104px] max-[640px]:py-[74px]">
        <div className="wrap">
          <SectionHead title={t('pages.grc.frameworksTitle')} />
          <div className="grid grid-cols-4 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1 gap-[18px] mt-12">
            {frameworks.map((f) => (
              <div key={f.name} className="reveal bg-ink-2 border border-soft rounded-panel px-[22px] py-[30px] text-center transition-all duration-[220ms] hover:border-teal/40 hover:-translate-y-[3px]">
                <b className="font-display font-semibold text-[1.12rem] block mb-1.5">{f.name}</b>
                <span className="font-mono text-[.72rem] text-slate tracking-[.08em] uppercase">{f.cat}</span>
              </div>
            ))}
          </div>
          <p className="reveal mt-[34px] text-paper-dim text-[.94rem] max-w-[680px]">{t('pages.grc.frameworksNote')}</p>
        </div>
      </section>

      <CtaBand title={t('pages.grc.ctaTitle')} desc={t('pages.grc.ctaDesc')} cta={t('pages.grc.cta')} />
    </>
  );
}

function TrackCard({ tag, title, desc, points }: { tag: string; title: string; desc: string; points: string[] }) {
  return (
    <div className="reveal panel-card p-8">
      <span className="font-mono text-[.72rem] tracking-[.12em] text-teal uppercase block mb-3.5">{tag}</span>
      <h3 className="font-display font-semibold text-[1.3rem] mb-3">{title}</h3>
      <p className="text-paper-dim text-[.93rem] mb-4">{desc}</p>
      <ul className="checklist !mb-0">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
