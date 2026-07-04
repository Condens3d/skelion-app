import { Link } from 'react-router-dom';

interface LogoProps {
  variant?: 'lockup' | 'mark';
  to?: string | null;
  className?: string;
  imgClass?: string;
  animated?: boolean;
  float?: boolean;
  onClick?: () => void;
  priority?: boolean;
}

/** Animated Skelion brand logo. Uses the transparent brand asset with a glow +
 *  light-sweep animation. Respects prefers-reduced-motion via CSS. */
export default function Logo({
  variant = 'lockup',
  to = '/',
  className = '',
  imgClass = '',
  animated = true,
  float = false,
  onClick,
  priority = false,
}: LogoProps) {
  const src = variant === 'mark' ? '/brand/skelion-mark.png' : '/brand/skelion-logo.png';
  const wrap = [
    'logo-shimmer overflow-hidden rounded',
    animated ? (float ? 'logo-float' : 'logo-anim') : '',
    to ? 'logo-hover' : '',
    className,
  ].filter(Boolean).join(' ');

  const img = (
    <span className={wrap}>
      <img
        src={src}
        alt="Skelion Enterprises"
        className={imgClass}
        draggable={false}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </span>
  );

  if (!to) return img;
  return (
    <Link to={to} onClick={onClick} aria-label="Skelion Enterprises — home" className="inline-flex items-center">
      {img}
    </Link>
  );
}
