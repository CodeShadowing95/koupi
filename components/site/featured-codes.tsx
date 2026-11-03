'use client';
// « Codes du moment » de l'accueil. Le serveur rend les meilleurs codes ; dès l'arrivée, la réserve est
// mélangée pour que chaque visite montre une autre sélection. « Voir d'autres codes » passe à la page
// suivante de la réserve : les coupons s'effacent puis les nouveaux montent (sans animation si
// « réduire les animations » est demandé). Rien ne change tout seul sous les yeux du visiteur.
import { useEffect, useRef, useState } from 'react';
import type { Code } from '@/lib/data';
import { pageOf, shuffled } from '@/lib/featured-codes';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import { BoardingCoupon } from '@/components/site/boarding-coupon';

export type FeaturedItem = { code: Code; link: string };

export function FeaturedCodes({ pool, count = 6 }: { pool: FeaturedItem[]; count?: number }) {
  const [order, setOrder] = useState(pool);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const changed = useRef(false);

  useEffect(() => { setOrder(shuffled(pool)); }, [pool]);

  const { contextSafe } = useGSAP({ scope: list });

  // Après un changement demandé par le visiteur, les nouveaux coupons montent un par un.
  useGSAP(() => {
    if (!changed.current) return;
    changed.current = false;
    gsap.matchMedia().add(MOTION_OK, () => {
      gsap.fromTo('.k-pass', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out', stagger: 0.06, onComplete: () => setBusy(false) });
    });
    if (!window.matchMedia(MOTION_OK).matches) setBusy(false);
  }, { scope: list, dependencies: [page] });

  const next = contextSafe(() => {
    if (busy) return;
    setBusy(true);
    const swap = () => { changed.current = true; setPage(current => current + 1); };
    if (!window.matchMedia(MOTION_OK).matches) { swap(); return; }
    gsap.to(list.current!.querySelectorAll('.k-pass'), { y: -12, opacity: 0, duration: 0.22, ease: 'power2.in', stagger: 0.03, onComplete: swap });
  });

  const shown = pageOf(order, page, count);
  return (
    <>
      <ul className="k-pass-grid" ref={list} aria-live="polite">
        {shown.map(({ code, link }, slot) => (
          // L'emplacement garde son élément (et son apparition au défilement) ; le coupon, lui, est neuf.
          <li key={slot} data-reveal>
            <BoardingCoupon key={code.id} code={code} link={link} light />
          </li>
        ))}
      </ul>
      {pool.length > count && (
        <div className="k-featured-more">
          <button type="button" className="k-btn k-btn-ghost" onClick={next} disabled={busy}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5" /></svg>
            Voir d&apos;autres codes
          </button>
        </div>
      )}
    </>
  );
}
