'use client';
import { useRef } from 'react';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';

// Compteur qui défile jusqu'à sa valeur quand il apparaît (inspiré de « Number Ticker », 21st.dev).
export function Counter({ value, suffix = '' }: { value: number; suffix?: string }) {
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
        onUpdate: () => { if (el.current) el.current.textContent = `${Math.round(state.n)}${suffix}`; },
      });
    });
  }, { scope: el });
  return <span ref={el}>{value}{suffix}</span>;
}
