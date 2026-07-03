interface SectionHeadProps {
  cmd?: string;
  title: string;
}

export default function SectionHead({ cmd, title }: SectionHeadProps) {
  return (
    <>
      {cmd && <div className="cmd reveal">{cmd}</div>}
      <h2 className="h2-display reveal">{title}</h2>
    </>
  );
}
