import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-soft bg-ink-2 pt-16 pb-10">
      <div className="wrap">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1 gap-11 mb-12">
          <div>
            <Logo variant="lockup" imgClass="h-[38px] w-auto block" />
            <p className="text-paper-dim text-[.9rem] my-4 max-w-[310px]">{t('footer.blurb')}</p>
            <span className="mini-mono block">skelionenterprises.com · +237 694 429 113</span>
            <a href="/rss.xml" className="mini-mono inline-flex items-center gap-1.5 mt-2.5 hover:!text-cyan before:content-['>_']">RSS</a>
          </div>
          <FootCol title={t('footer.services')}>
            <FootLink to="/pentesting">{t('footer.pentest')}</FootLink>
            <FootLink to="/grc">{t('footer.grc')}</FootLink>
            <FootLink to="/ciso">{t('footer.ciso')}</FootLink>
            <FootLink to="/training">{t('footer.training')}</FootLink>
          </FootCol>
          <FootCol title={t('footer.more')}>
            <FootLink to="/licenses">{t('footer.licensing')}</FootLink>
            <FootLink to="/physical">{t('footer.physical')}</FootLink>
            <FootLink to="/insights">{t('footer.insights')}</FootLink>
            <FootLink to="/assessment">{t('footer.assessment')}</FootLink>
          </FootCol>
          <FootCol title={t('footer.company')}>
            <FootLink to="/about">{t('footer.about')}</FootLink>
            <FootLink to="/faq">{t('footer.faq')}</FootLink>
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
          <span className="inline-flex items-center gap-2">
            <span className="w-[7px] h-[7px] rounded-full bg-teal animate-pulse2" aria-hidden="true" />
            {t('footer.exit')}
          </span>
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
