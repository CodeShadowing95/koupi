'use client';
// Réglage d'affichage des coupons, partagé par l'Explorer et la page d'un créateur : cartes détaillées ou simples.
// Un seul choix par navigateur pour les deux pages. La teinte des coupons suit le thème du site (clair ou sombre), sans réglage à part.
import { useEffect, useState } from 'react';
import { readCardView, saveCardView, type CardView } from '@/lib/explore';

/** Choix gardé par ce navigateur, lu après le premier rendu (le serveur rend toujours « détaillées »). */
export function useCodeViews() {
  const [cards, setCards] = useState<CardView>('detailed');
  useEffect(() => {
    setCards(readCardView(window.localStorage));
  }, []);
  const chooseCards = (view: CardView) => { setCards(view); saveCardView(window.localStorage, view); };
  return { cards, chooseCards };
}

/** Classe de la grille de coupons selon le choix. */
export function codeGridClass(cards: CardView, extra = ''): string {
  return `k-code-grid${extra ? ` ${extra}` : ''}${cards === 'simple' ? ' is-simple' : ''}`;
}

type Props = { cards: CardView; onCards: (view: CardView) => void };

export function CodeViewToggles({ cards, onCards }: Props) {
  // Cartes détaillées ou simples : juste au-dessus des coupons qu'il change.
  return (
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
  );
}
