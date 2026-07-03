import { useTranslation } from 'react-i18next';

interface Phase { id: string; title: string; desc: string }

export default function GrcTracks() {
  const { t } = useTranslation();
  const chipsA = t('grc.trackAChips', { returnObjects: true }) as string[];
  const chipsB = t('grc.trackBChips', { returnObjects: true }) as string[];
  const phases = t('grc.phases', { returnObjects: true }) as Phase[];
  return (
    <section id="grc" className="py-[104px] max-[640px]:py-[74px] bg-ink-2 border-y border-soft">
      <div className="wrap">
        <div className="cmd reveal">{t('grc.cmd')}</div>
        <h2 className="h2-display reveal">
          {t('grc.titleA')}<span className="text-cyan">{t('grc.titleAccent')}</span>{t('grc.titleB')}
        </h2>
        <p className="sub reveal">{t('grc.sub')}</p>
        <div className="grid grid-cols-2 max-[640px]:grid-cols-1 gap-[22px] mt-12">
          <Track tag={t('grc.trackATag')} title={t('grc.trackATitle')} desc={t('grc.trackADesc')} chips={chipsA} hotFirst />
          <Track tag={t('grc.trackBTag')} title={t('grc.trackBTitle')} desc={t('grc.trackBDesc')} chips={chipsB} hotFirst />
        </div>
        <div className="grid grid-cols-4 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1 mt-[52px] border border-soft rounded-panel overflow-hidden">
          {phases.map((p) => (
            <div key={p.id} className="reveal px-[26px] py-8 border-r border-soft last:border-r-0 max-[1024px]:border-b max-[1024px]:border-soft bg-ink-2">
              <b className="font-mono text-cyan text-[.8rem] tracking-[.1em] block mb-3">{p.id}</b>
              <h4 className="font-display font-semibold text-[1.02rem] mb-2">{p.title}</h4>
              <p className="text-paper-dim text-[.86rem]">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Track({ tag, title, desc, chips, hotFirst }: { tag: string; title: string; desc: string; chips: string[]; hotFirst?: boolean }) {
  return (
    <div className="reveal panel-card p-8">
      <span className="font-mono text-[.72rem] tracking-[.12em] text-teal uppercase block mb-3.5">{tag}</span>
      <h3 className="font-display font-semibold text-[1.3rem] mb-3">{title}</h3>
      <p className="text-paper-dim text-[.93rem] mb-1.5">{desc}</p>
      <div className="flex flex-wrap gap-[9px] mt-[18px]">
        {chips.map((c, i) => (
          <span
            key={c}
            className={`font-mono text-[.74rem] px-[13px] py-1.5 rounded-full border tracking-[.03em] ${
              hotFirst && i === 0 ? 'border-cyan/40 text-cyan' : 'border-soft text-paper-dim'
            }`}
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
