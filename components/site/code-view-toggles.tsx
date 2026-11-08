'use client';
// Réglages d'affichage des coupons, partagés par l'Explorer et la page d'un créateur :
// teinte (papier crème ou « ticket de nuit ») et cartes détaillées ou simples. Un seul choix par navigateur pour les deux pages.
import { useEffect, useState } from 'react';
import { readCardView, readCouponTone, saveCardView, saveCouponTone, type CardView, type CouponTone } from '@/lib/explore';

/** Choix gardés par ce navigateur, lus après le premier rendu (le serveur rend toujours « détaillées » et « clairs »). */
export function useCodeViews() {
  const [cards, setCards] = useState<CardView>('detailed');
  const [tone, setTone] = useState<CouponTone>('light');
  useEffect(() => {
    setCards(readCardView(window.localStorage));
    setTone(readCouponTone(window.localStorage));
  }, []);
  const chooseCards = (view: CardView) => { setCards(view); saveCardView(window.localStorage, view); };
  const chooseTone = (next: CouponTone) => { setTone(next); saveCouponTone(window.localStorage, next); };
  return { cards, tone, chooseCards, chooseTone };
}

/** Classe de la grille de coupons selon les choix. */
export function codeGridClass(cards: CardView, tone: CouponTone, extra = ''): string {
  return `k-code-grid${extra ? ` ${extra}` : ''}${cards === 'simple' ? ' is-simple' : ''}${tone === 'night' ? ' is-night' : ''}`;
}

type Props = { cards: CardView; tone: CouponTone; onCards: (view: CardView) => void; onTone: (tone: CouponTone) => void };

export function CodeViewToggles({ cards, tone, onCards, onTone }: Props) {
  return (
    <>
      {/* Coupons clairs (papier crème) ou sombres (« ticket de nuit »). */}
      <div className="k-board-views k-ex-views is-icons" role="group" aria-label="Teinte des coupons">
        <button type="button" aria-pressed={tone === 'light'} onClick={() => onTone('light')} aria-label="Coupons clairs" title="Clairs : papier crème">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        </button>
        <button type="button" aria-pressed={tone === 'night'} onClick={() => onTone('night')} aria-label="Coupons sombres" title="Sombres : ticket de nuit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
        </button>
      </div>
      {/* Cartes détaillées ou simples : juste au-dessus des coupons qu'il change. */}
      <div className="k-board-views k-ex-views" role="group" aria-label="Affichage des cartes">
        <button type="button" aria-pressed={cards === 'detailed'} onClick={() => onCards('detailed')} aria-label="Cartes détaillées" title="Détaillées : outil, statut, créateur, réduction et talon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
          <span>Détaillées</span>
        </button>
        <button type="button" aria-pressed={cards === 'simple'} onClick={() => onCards('simple')} aria-label="Cartes simples" title="Simples : outil, créateur, réduction et talon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M8 12h8" /></svg>
          <span>Simples</span>
        </button>
      </div>
    </>
  );
}
