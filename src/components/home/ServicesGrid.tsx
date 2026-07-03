import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Card { id: string; path: string; title: string; desc: string; go: string }
const ROUTES = ['/pentesting', '/grc', '/ciso', '/training', '/licenses', '/physical'];

export default function ServicesGrid() {
  const { t } = useTranslation();
  const cards = t('services.cards', { returnObjects: true }) as Card[];
  return (
    <section id="services" className="py-[104px] max-[640px]:py-[74px]">
      <div className="wrap">
        <div className="cmd reveal">
          &gt; cat services.md <span className="animate-blink text-cyan">▌</span>
        </div>
        <h2 className="h2-display reveal">
          {t('services.titleA')}<span className="text-cyan">{t('services.titleAccent')}</span>{t('services.titleB')}
        </h2>
        <p className="sub reveal">{t('services.sub')}</p>
        <div className="grid grid-cols-3 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1 gap-[22px] mt-[52px]">
          {cards.map((c, i) => (
            <Link
              key={c.id}
              to={ROUTES[i]}
              className="svc reveal group relative flex flex-col bg-ink-2 border border-soft rounded-panel px-7 py-8 overflow-hidden transition-all duration-[250ms] hover:border-cyan/45 hover:-translate-y-1 hover:bg-ink-3
                before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-cyan before:to-teal before:scale-x-0 before:origin-left before:transition-transform before:duration-300 hover:before:scale-x-100"
            >
              <div className="font-mono text-[.74rem] text-paper-dim tracking-[.1em] mb-[18px] flex justify-between items-center">
                <span>{c.id}</span>
                <span className="text-teal">{c.path}</span>
              </div>
              <h3 className="font-display font-semibold text-[1.28rem] mb-3 tracking-[-.01em] !text-paper">{c.title}</h3>
              <p className="text-paper-dim text-[.94rem] flex-1">{c.desc}</p>
              <span className="font-mono text-[.78rem] !text-cyan mt-[22px] inline-flex gap-2 items-center after:content-['→'] after:transition-transform after:duration-200 group-hover:after:translate-x-[5px]">
                {c.go}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
