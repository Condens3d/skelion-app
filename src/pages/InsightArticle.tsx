import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';
import { api, ApiError, type PostFull } from '../lib/api';
import { renderMarkdown } from '../lib/mdRender';

export default function InsightArticle() {
  const { t, i18n } = useTranslation();
  const fr = i18n.resolvedLanguage === 'fr';
  const { slug = '' } = useParams();
  const [post, setPost] = useState<PostFull | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'notfound' | 'error'>('loading');

  useEffect(() => {
    setState('loading');
    api
      .getInsight(slug)
      .then((p) => {
        setPost(p);
        setState('ok');
      })
      .catch((e) => setState(e instanceof ApiError && e.status === 404 ? 'notfound' : 'error'));
  }, [slug]);

  const title = post ? (fr ? post.title_fr : post.title_en) : '';
  const excerpt = post ? (fr ? post.excerpt_fr : post.excerpt_en) : '';
  useSeo({
    title: title ? `${title} — Skelion Enterprises` : t('insights.articleSeo'),
    description: excerpt || t('insights.seoDesc'),
    path: `/insights/${slug}`,
  });

  const body = post ? (fr ? post.body_fr || post.body_en : post.body_en) : '';

  return (
    <article className="pt-[140px] pb-24 max-[640px]:pt-[110px]">
      <div className="wrap max-w-[760px]">
        <Link to="/insights" className="font-mono text-[.8rem] !text-cyan inline-flex items-center gap-2 before:content-['←'] mb-8">
          {t('insights.back')}
        </Link>

        {state === 'loading' && (
          <p className="font-mono text-[.85rem] text-slate">
            <span className="text-cyan">$</span> {t('insights.loading')}
            <span className="inline-block w-2 h-4 bg-teal align-[-2px] animate-blink-fast ml-1" />
          </p>
        )}

        {state === 'notfound' && (
          <div className="neu p-10 text-center">
            <div className="font-mono text-termamber text-[.85rem] mb-3">[-] 404: {t('insights.notFound')}</div>
            <Link to="/insights" className="btn btn-ghost mt-2">{t('insights.back')}</Link>
          </div>
        )}

        {state === 'error' && <p className="font-mono text-[.85rem] text-termred">{t('insights.error')}</p>}

        {state === 'ok' && post && (
          <>
            <div className="flex items-center gap-3 mb-4">
              {post.tag && <span className="font-mono text-[.72rem] tracking-[.1em] uppercase text-teal">{post.tag}</span>}
              <span className="mini-mono">
                {post.published_at ? new Date(post.published_at).toISOString().slice(0, 10) : ''}
              </span>
            </div>
            <h1 className="font-display font-bold text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.1] tracking-[-.02em] mb-6">
              {title}
            </h1>
            {excerpt && <p className="text-paper-dim text-[1.1rem] mb-8 pb-8 border-b border-soft">{excerpt}</p>}
            <div className="prose-skelion" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
          </>
        )}
      </div>
    </article>
  );
}
