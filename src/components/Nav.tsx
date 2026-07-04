import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { changeLang, type Lang } from '../i18n';

const links = [
  { to: '/pentesting', key: 'pentesting' },
  { to: '/grc', key: 'grc' },
  { to: '/ciso', key: 'ciso' },
  { to: '/training', key: 'training' },
  { to: '/licenses', key: 'licenses' },
  { to: '/physical', key: 'physical' },
  { to: '/insights', key: 'insights' },
] as const;

export default function Nav() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const lang = i18n.resolvedLanguage === 'fr' ? 'fr' : 'en';

  const switchTo = (lng: Lang) => {
    void changeLang(lng);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-ink/85 backdrop-blur-xl border-b border-soft">
      <div className="max-w-site mx-auto px-7 h-[66px] flex items-center justify-between gap-5">
        <Link
          to="/"
          className="flex items-center gap-2.5"
          onClick={() => setOpen(false)}
          aria-label="Skelion Enterprises — home"
        >
          <span className="logo-shimmer logo-anim logo-hover overflow-hidden rounded inline-block shrink-0">
            <img src="/brand/skelion-mark.png" alt="" className="h-[32px] w-auto block" draggable={false} decoding="async" />
          </span>
          <span className="font-mono font-medium text-[1.02rem] !text-paper tracking-[.06em] max-[420px]:hidden">SKELION</span>
          <span className="w-[8px] h-[16px] bg-teal inline-block animate-blink max-[420px]:hidden" aria-hidden="true" />
        </Link>

        <button
          className="min-[981px]:hidden bg-transparent border border-soft text-paper font-mono px-3 py-[7px] rounded-brand cursor-pointer text-[.85rem]"
          aria-label={t('nav.menuLabel')}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {t('nav.menu')}
        </button>

        <ul
          className={`${
            open ? 'flex' : 'hidden'
          } min-[981px]:flex max-[980px]:absolute max-[980px]:top-[66px] max-[980px]:left-0 max-[980px]:right-0 max-[980px]:bg-ink-2 max-[980px]:flex-col max-[980px]:items-start max-[980px]:px-7 max-[980px]:py-[22px] max-[980px]:gap-[18px] max-[980px]:border-b max-[980px]:border-soft items-center gap-[22px] list-none`}
        >
          {links.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `font-mono text-[.8rem] tracking-[.05em] transition-colors ${
                    isActive ? '!text-cyan' : '!text-paper-dim hover:!text-cyan'
                  }`
                }
              >
                {t(`nav.${l.key}`)}
              </NavLink>
            </li>
          ))}
          <li>
            <div
              className="flex items-center font-mono text-[.78rem] border border-soft rounded-brand overflow-hidden"
              role="group"
              aria-label={t('nav.langLabel')}
            >
              <button
                onClick={() => switchTo('en')}
                aria-pressed={lang === 'en'}
                className={`px-2.5 py-[6px] cursor-pointer transition-colors ${
                  lang === 'en' ? 'bg-cyan text-ink font-medium' : 'bg-transparent text-paper-dim hover:text-cyan'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => switchTo('fr')}
                aria-pressed={lang === 'fr'}
                className={`px-2.5 py-[6px] cursor-pointer transition-colors ${
                  lang === 'fr' ? 'bg-cyan text-ink font-medium' : 'bg-transparent text-paper-dim hover:text-cyan'
                }`}
              >
                FR
              </button>
            </div>
          </li>
          <li>
            <NavLink
              to="/contact"
              onClick={() => setOpen(false)}
              className="font-mono text-[.8rem] px-[18px] py-[9px] border border-cyan !text-cyan rounded-brand tracking-[.05em] transition-all hover:bg-cyan hover:!text-ink"
            >
              {t('nav.engage')}
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}
