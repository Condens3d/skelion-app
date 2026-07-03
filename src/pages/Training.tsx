import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';
import { useReveal } from '../lib/useReveal';
import PageHeader from '../components/pages/PageHeader';
import SectionHead from '../components/pages/SectionHead';
import CtaBand from '../components/pages/CtaBand';

interface Track {
  lvl: 'foundation' | 'technical' | 'executive';
  title: string;
  aud: string;
  desc: string;
  points: string[];
}

export default function Training() {
  const { t } = useTranslation();
  useSeo({ title: t('pages.training.seoTitle'), description: t('pages.training.seoDesc'), path: '/training' });
  useReveal();
  const tracks = t('pages.training.tracks', { returnObjects: true }) as Track[];
  const delivery = t('pages.training.delivery', { returnObjects: true }) as string[];
  const lvlLabel = {
    foundation: t('training.lvlFoundation'),
    technical: t('training.lvlTechnical'),
    executive: t('training.lvlExecutive'),
  };
  const lvlClass = {
    foundation: 'bg-teal text-ink',
    technical: 'bg-cyan text-ink',
    executive: 'bg-paper text-ink',
  };

  return (
    <>
      <PageHeader cmd={t('pages.training.cmd')} sub={t('pages.training.sub')}>
        {t('pages.training.titleA')}
        <span className="text-cyan">{t('pages.training.titleAccent')}</span>
      </PageHeader>

      <section className="pb-[104px] max-[640px]:pb-[74px]">
        <div className="wrap">
          <SectionHead cmd={t('pages.training.tracksCmd')} title={t('pages.training.tracksTitle')} />
          <div className="grid grid-cols-2 max-[1024px]:grid-cols-1 gap-[22px] mt-12">
            {tracks.map((c) => (
              <div key={c.title} className="reveal bg-ink-2 border border-soft rounded-panel p-8 transition-all duration-[220ms] hover:border-cyan/40">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <span className={`font-mono text-[.7rem] tracking-[.12em] uppercase inline-block px-2.5 py-1 rounded font-medium ${lvlClass[c.lvl]}`}>
                    {lvlLabel[c.lvl]}
                  </span>
                  <span className="mini-mono">{c.aud}</span>
                </div>
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
        <div className="wrap grid grid-cols-[1fr_1fr] max-[1024px]:grid-cols-1 gap-14 items-start">
          <div>
            <span className="mini-mono text-teal reveal block">{t('pages.training.deliveryKicker')}</span>
            <h2 className="h2-display reveal mt-2">{t('pages.training.deliveryTitle')}</h2>
          </div>
          <ul className="checklist">
            {delivery.map((d) => (
              <li key={d} className="reveal">{d}</li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand title={t('pages.training.ctaTitle')} desc={t('pages.training.ctaDesc')} cta={t('pages.training.cta')} />
    </>
  );
}
