import { useTranslation } from 'react-i18next';

interface Course { lvl: 'foundation' | 'technical' | 'executive'; title: string; desc: string }

export default function CourseGrid() {
  const { t } = useTranslation();
  const courses = t('training.courses', { returnObjects: true }) as Course[];
  const lvlLabel = {
    foundation: t('training.lvlFoundation'),
    technical: t('training.lvlTechnical'),
    executive: t('training.lvlExecutive'),
  };
  const lvlClass = {
    foundation: 'bg-teal text-ink',
    technical: 'bg-cyan text-ink',
    executive: 'bg-paper text-ink',
  };
  return (
    <section id="training" className="py-[104px] max-[640px]:py-[74px] bg-ink-2 border-y border-soft">
      <div className="wrap">
        <div className="cmd reveal">{t('training.cmd')}</div>
        <h2 className="h2-display reveal">
          {t('training.titleA')}<span className="text-cyan">{t('training.titleAccent')}</span>
        </h2>
        <p className="sub reveal">{t('training.sub')}</p>
        <div className="grid grid-cols-3 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1 gap-[22px] mt-12">
          {courses.map((c) => (
            <div key={c.title} className="reveal bg-ink-2 border border-soft rounded-panel p-7 transition-all duration-[220ms] hover:border-cyan/40">
              <span className={`font-mono text-[.7rem] tracking-[.12em] uppercase inline-block px-2.5 py-1 rounded mb-4 font-medium ${lvlClass[c.lvl]}`}>
                {lvlLabel[c.lvl]}
              </span>
              <h4 className="font-display font-semibold text-[1.08rem] mb-2">{c.title}</h4>
              <p className="text-paper-dim text-[.88rem]">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
