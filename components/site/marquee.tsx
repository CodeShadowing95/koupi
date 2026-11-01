'use client';
import { useRef } from 'react';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';

const Scissors = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" /></svg>
);

// Bandeau défilant infini (inspiré des « Logo Marquee » de 21st.dev), animé avec GSAP :
// il ralentit au survol et s'arrête si l'utilisateur préfère réduire les animations.
// `speed` est en pixels par seconde : la vitesse reste la même quelle que soit la longueur du bandeau.
export function Marquee({ items, reverse = false, speed = 155, className = '' }: { items: string[]; reverse?: boolean; speed?: number; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const track = root.current?.querySelector<HTMLElement>('.k-marquee');
      if (!track) return;
      const duration = Math.max(track.scrollWidth / 2 / speed, 10);
      const tween = gsap.fromTo(track, { xPercent: reverse ? -50 : 0 }, { xPercent: reverse ? 0 : -50, duration, ease: 'none', repeat: -1 });
      const slow = () => gsap.to(tween, { timeScale: 0.25, duration: 0.6 });
      const fast = () => gsap.to(tween, { timeScale: 1, duration: 0.6 });
      root.current?.addEventListener('pointerenter', slow);
      root.current?.addEventListener('pointerleave', fast);
      return () => { root.current?.removeEventListener('pointerenter', slow); root.current?.removeEventListener('pointerleave', fast); };
    });
  }, { scope: root });

  const group = (hidden: boolean) => (
    <div className="k-marquee-group" aria-hidden={hidden || undefined}>
      {items.map((item, index) => <span className="k-marquee-item" key={`item-${index}`}>{item}<Scissors /></span>)}
    </div>
  );
  return (
    <div className={`k-band ${className}`} ref={root}>
      <div className="k-marquee">{group(false)}{group(true)}</div>
    </div>
  );
}
