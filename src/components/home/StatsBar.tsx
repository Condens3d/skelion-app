import { useTranslation } from 'react-i18next';

export default function StatsBar() {
  const { t } = useTranslation();
  const stats = [
    <b key="1" className="stat-n">{t('stats.s1n')}</b>,
    <b key="2" className="stat-n">{t('stats.s2n')}<span className="text-cyan">{t('stats.s2plus')}</span></b>,
    <b key="3" className="stat-n">{t('stats.s3n')}</b>,
    <b key="4" className="stat-n">{t('stats.s4n')}<span className="text-cyan">{t('stats.s4deg')}</span></b>,
  ];
  const labels = [t('stats.s1l'), t('stats.s2l'), t('stats.s3l'), t('stats.s4l')];
  return (
    <div className="border-y border-soft">
      <div className="wrap !px-0 grid grid-cols-4 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1">
        {stats.map((num, idx) => (
          <div key={idx} className="reveal px-[30px] py-11 border-r border-soft last:border-r-0 max-[1024px]:border-b max-[1024px]:border-soft">
            <span className="font-display text-[2.3rem] font-bold text-paper block tracking-[-.02em] leading-tight">{num}</span>
            <span className="font-mono text-[.76rem] text-paper-dim tracking-[.1em] uppercase">{labels[idx]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
