import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Terminal, { TermLine } from '../Terminal';
import NodeMesh from '../NodeMesh';

const TERM_LINES: TermLine[] = [
  { t: '$ skelion --init engagement', c: 'c-prompt', d: 400 },
  { t: '[+] Loading capability modules...', c: 'c-dim', d: 500 },
  { t: '  ✓ offensive_security ......... READY', c: 'c-ok', d: 220 },
  { t: '  ✓ grc_iso_audit .............. READY', c: 'c-ok', d: 220 },
  { t: '  ✓ ciso_as_a_service .......... READY', c: 'c-ok', d: 220 },
  { t: '  ✓ training ................... READY', c: 'c-ok', d: 220 },
  { t: '  ✓ licensing .................. READY', c: 'c-ok', d: 220 },
  { t: '  ✓ physical_security .......... READY', c: 'c-ok', d: 320 },
  { t: '[!] Threat landscape: ACTIVE', c: 'c-warn', d: 520 },
  { t: '$ ./secure --target your_enterprise', c: 'c-prompt', d: 600 },
  { t: '>> Scoping attack surface... done', c: 'c-out', d: 420 },
  { t: '>> Mapping compliance gaps... done', c: 'c-out', d: 420 },
  { t: '>> Assigning senior operators... done', c: 'c-out', d: 520 },
  { t: 'STATUS: ready_to_engage ✓', c: 'c-ok', d: 900 },
];

export default function Hero() {
  const { t } = useTranslation();
  const tags = t('home.tags', { returnObjects: true }) as string[];
  const tagline = t('home.tagline', { returnObjects: true }) as string[];
  return (
    <header className="relative min-h-screen flex items-center pt-[150px] pb-[90px] overflow-hidden">
      <NodeMesh className="opacity-[0.9]" />
      <div className="relative z-10 wrap grid grid-cols-[1.05fr_.95fr] max-[1024px]:grid-cols-1 gap-14 items-center w-full">
        <div>
          <span className="font-mono text-[.78rem] text-teal tracking-[.14em] border border-teal/30 inline-flex gap-2 items-center px-3.5 py-1.5 rounded-full mb-[26px] bg-teal/5">
            <span className="w-[7px] h-[7px] rounded-full bg-teal animate-pulse2" aria-hidden="true" />
            {t('home.eyebrow')}
          </span>
          <h1 className="font-display font-bold text-[clamp(2.6rem,5.4vw,4.1rem)] leading-[1.06] tracking-[-.03em] mb-[22px]">
            {t('home.h1a')}
            <br />
            <span className="text-cyan">{t('home.h1b')}</span>
            {t('home.h1bRest')}
            <br />
            <span className="text-teal">{t('home.h1c')}</span>
            {t('home.h1cRest')}
          </h1>
          <p className="text-paper-dim text-[1.12rem] max-w-[540px] mb-6">{t('home.lead')}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-[30px] font-mono text-[.82rem]" aria-label={tagline.join(' ')}>
            {tagline.map((clause, i) => (
              <span
                key={clause}
                className="animate-float-up inline-flex items-center after:content-['/'] after:ml-3 after:text-slate last:after:content-['']"
                style={{ animationDelay: `${0.2 + i * 0.22}s` }}
              >
                <span className="text-cyan mr-1.5" aria-hidden="true">&gt;</span>
                <span className="text-paper-dim tracking-[.02em]">{clause}</span>
              </span>
            ))}
          </div>
          <div className="flex gap-4 flex-wrap mb-9">
            <Link to="/contact" className="btn btn-primary neu-btn">{t('home.ctaPrimary')}</Link>
            <a href="#services" className="btn btn-ghost neu-btn">{t('home.ctaGhost')}</a>
          </div>
          <div className="font-mono text-[.78rem] text-paper-dim flex gap-[18px] flex-wrap">
            {tags.map((tag) => (
              <span key={tag} className="before:content-['#'] before:text-cyan">{tag}</span>
            ))}
          </div>
        </div>
        <Terminal lines={TERM_LINES} title={t('home.termTitle')} ariaLabel={t('home.termAria')} />
      </div>
    </header>
  );
}
