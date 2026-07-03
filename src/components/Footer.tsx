import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-soft bg-ink-2 pt-16 pb-10">
      <div className="wrap">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1 gap-11 mb-12">
          <div>
            <Link to="/" className="font-mono font-medium text-[1.02rem] !text-paper inline-flex items-center gap-[9px] tracking-[.04em]">
              <span className="text-cyan">&gt;</span> SKELION
              <span className="w-[9px] h-[18px] bg-teal inline-block animate-blink" aria-hidden="true" />
            </Link>
            <p className="text-paper-dim text-[.9rem] my-4 max-w-[300px]">{t('footer.blurb')}</p>
            <span className="mini-mono">skelionenterprises.com · +237 694 429 113</span>
          </div>
          <FootCol title={t('footer.services')}>
            <FootLink to="/pentesting">{t('footer.pentest')}</FootLink>
            <FootLink to="/grc">{t('footer.grc')}</FootLink>
            <FootLink to="/ciso">{t('footer.ciso')}</FootLink>
          </FootCol>
          <FootCol title={t('footer.more')}>
            <FootLink to="/training">{t('footer.training')}</FootLink>
            <FootLink to="/licenses">{t('footer.licensing')}</FootLink>
            <FootLink to="/physical">{t('footer.physical')}</FootLink>
          </FootCol>
          <FootCol title={t('footer.engage')}>
            <FootLink to="/contact">{t('footer.contact')}</FootLink>
            <li>
              <a href="tel:+237694429113" className="!text-paper-dim font-mono text-[.82rem] hover:!text-cyan before:content-['>_'] before:text-paper-dim">
                {t('footer.call')}
              </a>
            </li>
          </FootCol>
        </div>
        <div className="border-t border-soft pt-7 flex justify-between items-center gap-4 flex-wrap font-mono text-[.76rem] text-paper-dim">
          <span>{t('footer.rights')}</span>
          <span>{t('footer.exit')}</span>
        </div>
      </div>
    </footer>
  );
}

function FootCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h5 className="font-mono text-[.76rem] text-paper-dim tracking-[.12em] uppercase mb-[18px]">{title}</h5>
      <ul className="list-none flex flex-col gap-[11px]">{children}</ul>
    </div>
  );
}

function FootLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="!text-paper-dim font-mono text-[.82rem] hover:!text-cyan before:content-['>_'] before:text-paper-dim">
        {children}
      </Link>
    </li>
  );
}
