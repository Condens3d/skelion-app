import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';
import { useReveal } from '../lib/useReveal';
import Hero from '../components/home/Hero';
import StatsBar from '../components/home/StatsBar';
import ServicesGrid from '../components/home/ServicesGrid';
import ScopeList from '../components/home/ScopeList';
import VendorGrid from '../components/home/VendorGrid';
import GrcTracks from '../components/home/GrcTracks';
import CisoBand from '../components/home/CisoBand';
import CourseGrid from '../components/home/CourseGrid';
import PhysGrid from '../components/home/PhysGrid';
import ContactSection from '../components/home/ContactSection';
import AssessmentBand from '../components/home/AssessmentBand';

/** JSON-LD ProfessionalService, ported verbatim from the approved reference. */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'Skelion Enterprises',
  url: 'https://skelionenterprises.com',
  telephone: '+237694429113',
  description:
    'Full-spectrum cybersecurity: penetration testing and red teaming, GRC and ISO certification support, CISO-as-a-Service, cybersecurity training, software license reselling and physical security devices.',
  areaServed: ['Cameroon', 'Central Africa', 'Worldwide (remote)'],
  availableLanguage: ['en', 'fr'],
  knowsAbout: [
    'Penetration Testing',
    'Red Teaming',
    'ISO 27001',
    'GRC',
    'CISO as a Service',
    'Cybersecurity Training',
    'Software Licensing',
    'Physical Security',
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Cybersecurity Services',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Penetration Testing & Red Teaming' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Security Auditing, GRC & ISO Certification Support' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'CISO-as-a-Service' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Cybersecurity Training' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Software License Reselling' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Physical Security Devices' } },
    ],
  },
};

export default function Home() {
  const { t } = useTranslation();
  useSeo({
    title: t('home.seoTitle'),
    description: t('home.seoDesc'),
    path: '/',
    jsonLd: JSON_LD,
  });
  useReveal();
  return (
    <>
      <Hero />
      <StatsBar />
      <ServicesGrid />
      <ScopeList />
      <VendorGrid />
      <GrcTracks />
      <CisoBand />
      <CourseGrid />
      <PhysGrid />
      <AssessmentBand />
      <ContactSection />
    </>
  );
}
