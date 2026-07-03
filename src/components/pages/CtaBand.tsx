import { Link } from 'react-router-dom';

interface CtaBandProps {
  title: string;
  desc: string;
  cta: string;
}

/** Bottom-of-page conversion band shared by all service pages. */
export default function CtaBand({ title, desc, cta }: CtaBandProps) {
  return (
    <section className="py-[104px] max-[640px]:py-[74px]">
      <div className="wrap">
        <div className="reveal relative overflow-hidden rounded-[14px] border border-soft bg-gradient-to-br from-ink-2 to-ink-3 p-14 max-[640px]:px-[26px] max-[640px]:py-9 text-center
          after:content-['$'] after:absolute after:bottom-[14px] after:right-6 after:font-mono after:text-[.72rem] after:text-slate/40">
          <h2 className="font-display font-bold text-[clamp(1.6rem,3vw,2.2rem)] tracking-[-.02em] mb-4">{title}</h2>
          <p className="text-paper-dim text-[.98rem] max-w-[620px] mx-auto mb-8">{desc}</p>
          <Link to="/contact" className="btn btn-primary">{cta}</Link>
        </div>
      </div>
    </section>
  );
}
