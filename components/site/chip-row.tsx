'use client';
// Rangée de pastilles qui défile sur le côté (page Codes), avec des flèches gauche et droite
// quand tout ne tient pas : chaque clic fait glisser la rangée d'un peu moins de sa largeur.
// Les flèches n'apparaissent que s'il reste quelque chose à voir de leur côté.
// paged : chaque clic avance d'une page entière (rangées de coupons), et les flèches restent visibles,
// grisées quand il n'y a plus rien de ce côté.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

const Chevron = ({ left }: { left?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={left ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
  </svg>
);

export function ChipRow({ label, className = '', paged = false, children }: { label: string; className?: string; paged?: boolean; children: ReactNode }) {
  const row = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = row.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener('scroll', measure, { passive: true });
    return () => { observer.disconnect(); el.removeEventListener('scroll', measure); };
  }, [measure, children]);

  const slide = (direction: 1 | -1) => {
    const el = row.current;
    if (!el) return;
    const smooth = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: direction * (paged ? el.clientWidth + gap : el.clientWidth * 0.75), behavior: smooth ? 'smooth' : 'auto' });
  };

  return (
    <div className={`k-chip-row${edges.left ? ' has-left' : ''}${edges.right ? ' has-right' : ''} ${className}`.trim()}>
      <button type="button" className="k-chip-arrow is-left" onClick={() => slide(-1)} aria-label={`${label} : voir les précédentes`} hidden={!paged && !edges.left} disabled={paged && !edges.left}><Chevron left /></button>
      <div className="k-board-cats-row" ref={row} role="group" aria-label={label}>{children}</div>
      <button type="button" className="k-chip-arrow is-right" onClick={() => slide(1)} aria-label={`${label} : voir les suivantes`} hidden={!paged && !edges.right} disabled={paged && !edges.right}><Chevron /></button>
    </div>
  );
}
