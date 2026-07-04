/**
 * Meta-prerender: writes dist/<route>/index.html for each public route with the
 * correct title/description/canonical/OG (and JSON-LD on home) baked into the
 * static HTML. Body content is still hydrated by React at runtime; this closes
 * the SPA gap where social scrapers and non-JS crawlers only saw the shell tags.
 *
 * Single source of truth: titles/descriptions come from src/i18n/locales/en.json,
 * the same copy the runtime useSeo hook reads.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://skelionenterprises.com';
const en = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/en.json'), 'utf8'));
const shell = readFileSync(resolve(root, 'dist/index.html'), 'utf8');

// route -> locale key path for seoTitle/seoDesc
const routes = [
  { path: '/', title: en.home.seoTitle, desc: en.home.seoDesc, home: true },
  { path: '/pentesting', title: en.pages.pentesting.seoTitle, desc: en.pages.pentesting.seoDesc },
  { path: '/grc', title: en.pages.grc.seoTitle, desc: en.pages.grc.seoDesc },
  { path: '/ciso', title: en.pages.ciso.seoTitle, desc: en.pages.ciso.seoDesc },
  { path: '/training', title: en.pages.training.seoTitle, desc: en.pages.training.seoDesc },
  { path: '/licenses', title: en.pages.licenses.seoTitle, desc: en.pages.licenses.seoDesc },
  { path: '/physical', title: en.pages.physical.seoTitle, desc: en.pages.physical.seoDesc },
  { path: '/contact', title: en.pages.contact.seoTitle, desc: en.pages.contact.seoDesc },
  { path: '/insights', title: en.insights.seoTitle, desc: en.insights.seoDesc },
  { path: '/about', title: en.about.seoTitle, desc: en.about.seoDesc },
  { path: '/faq', title: en.faq.seoTitle, desc: en.faq.seoDesc },
];

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'Skelion Enterprises',
  url: SITE,
  telephone: '+237694429113',
  description:
    'Full-spectrum cybersecurity: penetration testing and red teaming, GRC and ISO certification support, CISO-as-a-Service, cybersecurity training, software license reselling and physical security devices.',
  areaServed: ['Cameroon', 'Central Africa', 'Worldwide (remote)'],
  availableLanguage: ['en', 'fr'],
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function headFor(r) {
  const url = SITE + (r.path === '/' ? '/' : r.path);
  const tags = [
    `<meta name="description" content="${esc(r.desc)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${esc(r.title)}" />`,
    `<meta property="og:description" content="${esc(r.desc)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${url}" />`,
  ];
  if (r.home) tags.push(`<script type="application/ld+json">${JSON.stringify(JSON_LD)}</script>`);
  return tags.join('\n    ');
}

function render(r) {
  let html = shell;
  // Replace the shell <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(r.title)}</title>`);
  // Replace the shell default description (avoid duplicate description tags)
  html = html.replace(/<meta\s+name="description"[\s\S]*?\/>/, '');
  // Inject per-route meta right before </head>
  html = html.replace('</head>', `    ${headFor(r)}\n  </head>`);
  return html;
}

let count = 0;
for (const r of routes) {
  const html = render(r);
  const outDir = r.path === '/' ? resolve(root, 'dist') : resolve(root, 'dist' + r.path);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'index.html'), html);
  count++;
}
console.log(`[prerender] wrote ${count} route HTML files with baked SEO meta`);
