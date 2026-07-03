import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';
import { useReveal } from '../lib/useReveal';
import ContactSection from '../components/home/ContactSection';

export default function Contact() {
  const { t } = useTranslation();
  useSeo({ title: t('pages.contact.seoTitle'), description: t('pages.contact.seoDesc'), path: '/contact' });
  useReveal();
  return (
    <div className="pt-[66px]">
      <ContactSection />
    </div>
  );
}
