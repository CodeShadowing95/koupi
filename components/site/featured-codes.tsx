'use client';
// « Codes du moment » de l'accueil. Le serveur rend les meilleurs codes ; dès l'arrivée, la réserve est
// mélangée pour que chaque visite montre une autre sélection. Rien ne change ensuite sous les yeux du visiteur :
// pour voir plus de codes, le coupon « Voir plus de codes » juste en dessous mène à la page Codes.
import { useEffect, useState } from 'react';
import type { Code } from '@/lib/data';
import { shuffled } from '@/lib/featured-codes';
import { BoardingCoupon } from '@/components/site/boarding-coupon';

export type FeaturedItem = { code: Code; link: string };

export function FeaturedCodes({ pool, count = 6 }: { pool: FeaturedItem[]; count?: number }) {
  const [order, setOrder] = useState(pool);
  useEffect(() => { setOrder(shuffled(pool)); }, [pool]);

  return (
    <ul className="k-pass-grid">
      {order.slice(0, count).map(({ code, link }, slot) => (
        // L'emplacement garde son élément (et son apparition au défilement) ; le coupon, lui, est neuf.
        <li key={slot} data-reveal>
          <BoardingCoupon key={code.id} code={code} link={link} light />
        </li>
      ))}
    </ul>
  );
}
