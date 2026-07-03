import { useEffect, useRef } from 'react';

export interface TermLine {
  t: string; // text
  c: 'c-prompt' | 'c-ok' | 'c-dim' | 'c-warn' | 'c-out'; // color class
  d: number; // delay after line completes (ms)
}

interface TerminalProps {
  lines: TermLine[];
  title: string;
  ariaLabel?: string;
  /** ms before the loop restarts once all lines are typed. Set 0 to disable looping. */
  loopAfter?: number;
  minHeightClass?: string;
}

const COLOR: Record<TermLine['c'], string> = {
  'c-prompt': 'text-cyan',
  'c-ok': 'text-teal',
  'c-dim': 'text-slate',
  'c-warn': 'text-termamber',
  'c-out': 'text-paper-dim',
};

/**
 * Self-typing terminal ported from the approved reference design.
 * Honors prefers-reduced-motion: renders all lines statically, no typing, no loop.
 */
export default function Terminal({
  lines,
  title,
  ariaLabel,
  loopAfter = 6000,
  minHeightClass = 'min-h-[330px] max-[640px]:min-h-[280px]',
}: TerminalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.innerHTML = '';

    const mkLine = (cls: string) => {
      const s = document.createElement('span');
      s.className = `block whitespace-pre-wrap break-words ${cls}`;
      body.appendChild(s);
      return s;
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      lines.forEach((l) => {
        mkLine(COLOR[l.c]).textContent = l.t;
      });
      return;
    }

    let cancelled = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(() => {
        if (!cancelled) fn();
      }, ms));
    };

    let i = 0;
    function typeLine() {
      if (cancelled) return;
      if (i >= lines.length) {
        const caretLine = mkLine(COLOR['c-prompt']);
        caretLine.textContent = '$ ';
        const caret = document.createElement('span');
        caret.className = 'inline-block w-2 h-[15px] bg-teal align-[-2px] animate-blink-fast';
        caretLine.appendChild(caret);
        if (loopAfter > 0) {
          later(() => {
            if (!bodyRef.current) return;
            bodyRef.current.innerHTML = '';
            i = 0;
            typeLine();
          }, loopAfter);
        }
        return;
      }
      const l = lines[i];
      const s = mkLine(COLOR[l.c]);
      let j = 0;
      (function tick() {
        if (cancelled) return;
        if (j <= l.t.length) {
          s.textContent = l.t.slice(0, j);
          j++;
          later(tick, l.c === 'c-prompt' ? 26 : 8);
        } else {
          i++;
          later(typeLine, l.d);
        }
      })();
    }
    typeLine();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [lines, loopAfter]);

  return (
    <div
      className="bg-ink-2 border border-soft rounded-panel overflow-hidden font-mono text-[.84rem] shadow-[0_24px_70px_rgba(0,0,0,.55),0_0_0_1px_rgba(19,199,236,.06)]"
      role="img"
      aria-label={ariaLabel ?? title}
    >
      <div className="flex items-center gap-2 px-4 py-3 bg-ink-3 border-b border-soft">
        <span className="w-[11px] h-[11px] rounded-full bg-termred" />
        <span className="w-[11px] h-[11px] rounded-full bg-termamber" />
        <span className="w-[11px] h-[11px] rounded-full bg-termgreen" />
        <span className="ml-2.5 text-slate text-[.76rem]">{title}</span>
      </div>
      <div ref={bodyRef} className={`px-[22px] py-5 leading-[1.9] ${minHeightClass}`} aria-hidden="true" />
    </div>
  );
}
