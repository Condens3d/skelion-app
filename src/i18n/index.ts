import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

export const SUPPORTED = ['en', 'fr'] as const;
export type Lang = (typeof SUPPORTED)[number];
const STORAGE_KEY = 'skelion-lang';

/** Reads the persisted choice, falling back to navigator then 'en'. */
export function detectInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'fr') return saved;
  } catch {
    /* localStorage unavailable (private mode); fall through */
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return nav === 'fr' ? 'fr' : 'en';
}

const loaded = new Set<Lang>(['en']);

/** Dynamically imports a locale bundle once, then registers it. */
export async function loadLang(lng: Lang): Promise<void> {
  if (loaded.has(lng)) return;
  const mod = await import(`./locales/${lng}.json`);
  i18n.addResourceBundle(lng, 'translation', mod.default, true, true);
  loaded.add(lng);
}

/** Loads the locale if needed, switches, and persists the choice. */
export async function changeLang(lng: Lang): Promise<void> {
  await loadLang(lng);
  await i18n.changeLanguage(lng);
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore persistence failure */
  }
}

export async function initI18n(initial: Lang): Promise<void> {
  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en } },
    lng: initial,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED as unknown as string[],
    interpolation: { escapeValue: false },
  });
  document.documentElement.lang = initial;
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
  });
  if (initial !== 'en') await loadLang(initial);
}

export default i18n;
