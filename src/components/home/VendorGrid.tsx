import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Vendor { name: string; cat: string }

export default function VendorGrid() {
  const { t } = useTranslation();
  const vendors = t('licenses.vendors', { returnObjects: true }) as Vendor[];
  return (
    <section id="licenses" className="py-[104px] max-[640px]:py-[74px]">
      <div className="wrap">
        <div className="cmd reveal">{t('licenses.cmd')}</div>
        <h2 className="h2-display reveal">
          {t('licenses.titleA')}<span className="text-teal">{t('licenses.titleAccent')}</span>
        </h2>
        <p className="sub reveal">{t('licenses.sub')}</p>
        <div className="grid grid-cols-4 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1 gap-[18px] mt-[52px]">
          {vendors.map((v) => (
            <div key={v.name} className="reveal bg-ink-2 border border-soft rounded-panel px-[22px] py-[30px] text-center transition-all duration-[220ms] hover:border-teal/40 hover:-translate-y-[3px]">
              <b className="font-display font-semibold text-[1.12rem] block mb-1.5">{v.name}</b>
              <span className="font-mono text-[.72rem] text-slate tracking-[.08em] uppercase">{v.cat}</span>
            </div>
          ))}
          <div className="reveal bg-ink-2 border border-dashed border-soft rounded-panel px-[22px] py-[30px] text-center text-slate transition-all duration-[220ms] hover:border-teal/40 hover:-translate-y-[3px]">
            <b className="font-display font-semibold text-[1.12rem] block mb-1.5 text-cyan">{t('licenses.moreName')}</b>
            <span className="font-mono text-[.72rem] tracking-[.08em] uppercase">{t('licenses.moreCat')}</span>
          </div>
        </div>
        <p className="reveal mt-[34px] text-paper-dim text-[.94rem] max-w-[680px]">
          {t('licenses.note')} <Link to="/contact">{t('licenses.noteLink')}</Link>
        </p>
      </div>
    </section>
  );
}
