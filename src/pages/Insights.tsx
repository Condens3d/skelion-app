import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';
import { useReveal } from '../lib/useReveal';
import { api, type PostListItem } from '../lib/api';
import Newsletter from '../components/Newsletter';

export default function Insights() {
  const { t, i18n } = useTranslation();
  const fr = i18n.resolvedLanguage === 'fr';
  useSeo({ title: t('insights.seoTitle'), description: t('insights.seoDesc'), path: '/insights' });
  useReveal();
  const [items, setItems] = useState<PostListItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.listInsights(30, 0).then((d) => setItems(d.items)).catch(() => setError(true));
  }, []);

  return (
    <>
      <header className="pt-[150px] pb-14 max-[640px]:pt-[120px]">
        <div className="wrap">
          <div className="cmd reveal">{t('insights.cmd')}</div>
          <h1 className="reveal font-display font-bold text-[clamp(2.2rem,4.6vw,3.4rem)] leading-[1.08] tracking-[-.03em] mb-[14px]">
            {t('insights.titleA')}<span className="text-cyan">{t('insights.titleAccent')}</span>
          </h1>
          <p className="sub reveal">{t('insights.sub')}</p>
        </div>
      </header>

      <section className="pb-[90px]">
        <div className="wrap">
          {error && <p className="font-mono text-[.85rem] text-termamber">{t('insights.error')}</p>}
          {items === null && !error && (
            <p className="font-mono text-[.85rem] text-slate">
              <span className="text-cyan">$</span> {t('insights.loading')}
              <span className="inline-block w-2 h-4 bg-teal align-[-2px] animate-blink-fast ml-1" />
            </p>
          )}
          {items !== null && items.length === 0 && (
            <div className="neu p-10 text-center">
              <div className="font-mono text-teal text-[.8rem] mb-3">// {t('insights.emptyTag')}</div>
              <p className="text-paper-dim text-[.95rem]">{t('insights.empty')}</p>
            </div>
          )}
          {items !== null && items.length > 0 && (
            <div className="grid grid-cols-3 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1 gap-[22px]">
              {items.map((p) => (
                <Link key={p.id} to={`/insights/${p.slug}`} className="neu neu-hover group flex flex-col p-7 reveal">
                  <div className="flex items-center justify-between mb-4">
                    {p.tag && <span className="font-mono text-[.7rem] tracking-[.1em] uppercase text-teal">{p.tag}</span>}
                    <span className="mini-mono">{p.published_at ? new Date(p.published_at).toISOString().slice(0, 10) : ''}</span>
                  </div>
                  <h2 className="font-display font-semibold text-[1.2rem] mb-2.5 tracking-[-.01em] !text-paper">
                    {fr ? p.title_fr : p.title_en}
                  </h2>
                  <p className="text-paper-dim text-[.9rem] flex-1">{fr ? p.excerpt_fr : p.excerpt_en}</p>
                  <span className="font-mono text-[.78rem] !text-cyan mt-5 inline-flex gap-2 items-center after:content-['→'] after:transition-transform group-hover:after:translate-x-[5px]">
                    {t('insights.read')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="pb-[104px]">
        <div className="wrap">
          <Newsletter />
        </div>
      </section>
    </>
  );
}
