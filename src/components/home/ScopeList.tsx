import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Scope { title: string; desc: string }

export default function ScopeList() {
  const { t } = useTranslation();
  const scopes = t('offense.scopes', { returnObjects: true }) as Scope[];
  const deliverables = t('offense.deliverables', { returnObjects: true }) as string[];
  return (
    <section id="offense" className="py-[104px] max-[640px]:py-[74px] bg-ink-2 border-y border-soft">
      <div className="wrap">
        <div className="cmd reveal">{t('offense.cmd')}</div>
        <h2 className="h2-display reveal">
          {t('offense.titleA')}<span className="text-cyan">{t('offense.titleAccent')}</span>{t('offense.titleB')}
        </h2>
        <p className="sub reveal">{t('offense.sub')}</p>
        <div className="grid grid-cols-2 max-[1024px]:grid-cols-1 gap-[60px] items-start mt-12">
          <ul className="list-none flex flex-col">
            {scopes.map((s, i) => (
              <li
                key={s.title}
                className="reveal group grid grid-cols-[64px_1fr] gap-5 items-start py-[22px] border-b border-soft transition-all duration-200 hover:pl-2"
              >
                <span className="font-mono text-[.86rem] text-paper-dim tracking-[.06em] pt-[3px] transition-colors group-hover:text-cyan">
                  [{String(i + 1).padStart(2, '0')}]
                </span>
                <div>
                  <h4 className="font-display font-semibold text-[1.06rem] mb-[5px]">{s.title}</h4>
                  <p className="text-paper-dim text-[.9rem]">{s.desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <aside className="reveal panel-card p-[34px] sticky top-24 max-[1024px]:static">
            <span className="mini-mono">{t('offense.panelKicker')}</span>
            <h3 className="font-display font-semibold text-[1.3rem] mt-2 mb-[18px]">{t('offense.panelTitle')}</h3>
            <p className="text-paper-dim text-[.94rem] mb-4">{t('offense.panelIntro')}</p>
            <ul className="checklist">
              {deliverables.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <Link to="/contact" className="btn btn-primary">{t('offense.panelCta')}</Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
