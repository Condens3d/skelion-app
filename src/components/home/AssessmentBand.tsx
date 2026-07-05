import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/** Home band promoting the interactive security posture assessment. */
export default function AssessmentBand() {
  const { t } = useTranslation();
  return (
    <section className="max-w-site mx-auto px-7 py-16">
      <div className="reveal neu neu-raised rounded-panel p-10 md:p-12 relative overflow-hidden">
        <div className="font-mono text-[.78rem] text-cyan tracking-[.08em] mb-3">&gt; {t('home.assessCmd')}</div>
        <h2 className="font-display text-[clamp(1.5rem,3.4vw,2.1rem)] font-bold text-paper tracking-[-.02em] mb-3 max-w-[620px]">
          {t('home.assessTitle')}
        </h2>
        <p className="text-paper-dim leading-relaxed max-w-[560px] mb-7">{t('home.assessDesc')}</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/assessment" className="btn btn-primary">{t('home.assessCta')}</Link>
          <span className="font-mono text-[.78rem] text-paper-dim">{t('home.assessMeta')}</span>
        </div>
      </div>
    </section>
  );
}
