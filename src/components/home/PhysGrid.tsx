import { useTranslation } from 'react-i18next';

interface Item { ico: string; title: string; desc: string }

export default function PhysGrid() {
  const { t } = useTranslation();
  const items = t('physical.items', { returnObjects: true }) as Item[];
  return (
    <section id="physical" className="py-[104px] max-[640px]:py-[74px]">
      <div className="wrap">
        <div className="cmd reveal">{t('physical.cmd')}</div>
        <h2 className="h2-display reveal">
          {t('physical.titleA')}<span className="text-teal">{t('physical.titleAccent')}</span>{t('physical.titleB')}
        </h2>
        <p className="sub reveal">{t('physical.sub')}</p>
        <div className="grid grid-cols-4 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1 gap-[18px] mt-12">
          {items.map((it) => (
            <div key={it.title} className="reveal bg-ink-2 border border-soft rounded-panel px-[22px] py-7 transition-all duration-[220ms] hover:border-teal/40">
              <span className="text-[1.5rem] mb-3.5 block text-teal" aria-hidden="true">{it.ico}</span>
              <h4 className="font-display font-semibold text-base mb-1.5">{it.title}</h4>
              <p className="text-paper-dim text-[.85rem]">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
