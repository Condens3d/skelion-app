import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function CisoBand() {
  const { t } = useTranslation();
  const points = t('ciso.points', { returnObjects: true }) as string[];
  return (
    <section id="ciso" className="py-[104px] max-[640px]:py-[74px]">
      <div className="wrap">
        <div className="cmd reveal">{t('ciso.cmd')}</div>
        <h2 className="h2-display reveal">
          <span className="text-teal">{t('ciso.titleAccent')}</span>{t('ciso.titleB')}
        </h2>
        <div className="reveal relative overflow-hidden grid grid-cols-[1.1fr_.9fr] max-[1024px]:grid-cols-1 gap-[52px] items-center mt-12 p-14 max-[640px]:px-[26px] max-[640px]:py-9 rounded-[14px] border border-soft bg-gradient-to-br from-ink-2 to-ink-3
          after:content-['>_CISO_--as-a-service'] after:absolute after:bottom-[18px] after:right-6 after:font-mono after:text-[.72rem] after:text-slate/40 after:tracking-[.08em]">
          <div>
            <h3 className="font-display font-bold text-[1.7rem] mb-4 tracking-[-.02em]">{t('ciso.bandTitle')}</h3>
            <p className="text-paper-dim text-[.98rem] mb-[18px]">{t('ciso.bandDesc')}</p>
            <Link to="/contact" className="btn btn-primary">{t('ciso.bandCta')}</Link>
          </div>
          <ul className="checklist">
            {points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
