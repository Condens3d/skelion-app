import { useTranslation } from 'react-i18next';
import ContactForm from './ContactForm';

/** Contact band shared by the home page and /contact. */
export default function ContactSection() {
  const { t } = useTranslation();
  return (
    <section id="contact" className="py-[104px] max-[640px]:py-[74px] bg-ink-2 border-t border-soft">
      <div className="wrap">
        <div className="cmd reveal">{t('contact.cmd')}</div>
        <h2 className="h2-display reveal">
          {t('contact.titleA')}<span className="text-cyan">{t('contact.titleAccent')}</span>
        </h2>
        <p className="sub reveal">{t('contact.sub')}</p>
        <div className="grid grid-cols-[1fr_1.1fr] max-[1024px]:grid-cols-1 gap-14 mt-12 items-start">
          <div>
            <Row k={t('contact.kPhone')}>
              <a href="tel:+237694429113">+237 694 429 113</a>
              <small>{t('contact.vPhoneNote')}</small>
            </Row>
            <Row k={t('contact.kWeb')}>
              <a href="https://skelionenterprises.com">skelionenterprises.com</a>
            </Row>
            <Row k={t('contact.kCoverage')}>
              {t('contact.vCoverage')}
              <small>{t('contact.vCoverageNote')}</small>
            </Row>
            <Row k={t('contact.kLanguages')}>{t('contact.vLanguages')}</Row>
            <Row k={t('contact.kResponse')}>
              {t('contact.vResponse')}
              <small>{t('contact.vResponseNote')}</small>
            </Row>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="reveal flex gap-4 items-start py-[18px] border-b border-soft">
      <span className="font-mono text-[.76rem] text-paper-dim w-[90px] shrink-0 tracking-[.08em] pt-[3px] uppercase">{k}</span>
      <div className="text-[.98rem] text-paper [&_small]:block [&_small]:text-paper-dim [&_small]:text-[.8rem] [&_small]:font-mono [&_small]:mt-0.5">
        {children}
      </div>
    </div>
  );
}
