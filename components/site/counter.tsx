'use client';
import { useRef } from 'react';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';

// Compteur qui défile jusqu'à sa valeur quand il apparaît (inspiré de « Number Ticker », 21st.dev).
const grouped = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, '\u00a0');

/** grouped : espaces entre les milliers (2 646). */
export function Counter({ value, suffix = '', group = false }: { value: number; suffix?: string; group?: boolean }) {
  const show = (n: number) => `${group ? grouped(n) : n}${suffix}`;
  const el = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const state = { n: 0 };
      gsap.to(state, {
        n: value,
        duration: 1.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el.current, start: 'top 90%', once: true },
        onUpdate: () => { if (el.current) el.current.textContent = show(Math.round(state.n)); },
      });
    });
  }, { scope: el });
  return <span ref={el}>{show(value)}</span>;
}
