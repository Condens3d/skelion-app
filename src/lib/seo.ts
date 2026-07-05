import { useEffect } from 'react';

// Canonical/OG URLs follow whatever origin the site is actually served from
// (skelionenterprises.com, skeliontech.com, localhost). SSR-safe fallback.
const SITE =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://skeliontech.com';

interface SeoOptions {
  title: string;
  description: string;
  path: string; // e.g. '/pentesting'
  jsonLd?: object; // home-page ProfessionalService schema
  noindex?: boolean;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useSeo({ title, description, path, jsonLd, noindex }: SeoOptions) {
  useEffect(() => {
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', SITE + path);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = SITE + (path === '/' ? '/' : path);

    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noindex) {
      if (!robots) {
        robots = document.createElement('meta');
        robots.name = 'robots';
        document.head.appendChild(robots);
      }
      robots.content = 'noindex';
    } else if (robots) {
      robots.remove();
    }

    const LD_ID = 'skelion-jsonld';
    const prev = document.getElementById(LD_ID);
    if (prev) prev.remove();
    if (jsonLd) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id = LD_ID;
      s.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(s);
    }
  }, [title, description, path, jsonLd, noindex]);
}
