interface PageHeaderProps {
  cmd: string;
  children: React.ReactNode; // heading content with accents
  sub: string;
}

/** Standard service-page opener: command line, display heading, sub. */
export default function PageHeader({ cmd, children, sub }: PageHeaderProps) {
  return (
    <header className="pt-[150px] pb-16 max-[640px]:pt-[120px]">
      <div className="wrap">
        <div className="cmd reveal">{cmd}</div>
        <h1 className="reveal font-display font-bold text-[clamp(2.2rem,4.6vw,3.4rem)] leading-[1.08] tracking-[-.03em] mb-[14px]">
          {children}
        </h1>
        <p className="sub reveal">{sub}</p>
      </div>
    </header>
  );
}
