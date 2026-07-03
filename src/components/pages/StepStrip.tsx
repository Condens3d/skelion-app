export interface Step {
  id: string;
  title: string;
  desc: string;
  out?: string;
}

interface StepStripProps {
  steps: Step[];
  cols?: 3 | 4 | 6;
}

/** Bordered process strip (the reference .proc pattern, generalized). */
export default function StepStrip({ steps, cols = 4 }: StepStripProps) {
  const colClass = cols === 6 ? 'grid-cols-3' : cols === 3 ? 'grid-cols-3' : 'grid-cols-4';
  return (
    <div className={`grid ${colClass} max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1 mt-12 border border-soft rounded-panel overflow-hidden`}>
      {steps.map((s) => (
        <div key={s.id} className="reveal px-[26px] py-8 border-r border-b border-soft bg-ink-2 [&:last-child]:border-r-0">
          <b className="font-mono text-cyan text-[.8rem] tracking-[.1em] block mb-3">{s.id}</b>
          <h3 className="font-display font-semibold text-[1.02rem] mb-2">{s.title}</h3>
          <p className="text-paper-dim text-[.86rem]">{s.desc}</p>
          {s.out && <span className="mini-mono block mt-3 text-teal">{s.out}</span>}
        </div>
      ))}
    </div>
  );
}
