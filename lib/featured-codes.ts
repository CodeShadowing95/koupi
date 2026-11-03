// « Codes du moment » de l'accueil : une réserve de codes, un par outil, mélangée à chaque visite
// et parcourue par pages avec le bouton « Voir d'autres codes ».
import type { Code } from './data';
import { featuredCodes } from './codes-board';

/** Réserve : les meilleurs codes (vérifiés d'abord), un seul par outil pour varier, au plus `size`. */
export function featuredPool(codes: Code[], size = 24): Code[] {
  const seen = new Set<string>();
  return featuredCodes(codes, codes.length).filter(code => {
    if (seen.has(code.tool)) return false;
    seen.add(code.tool);
    return true;
  }).slice(0, size);
}

/** Copie mélangée (Fisher-Yates). `random` est injectable pour les tests. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Les `count` éléments de la page `page`, en repartant du début une fois la réserve parcourue. */
export function pageOf<T>(order: readonly T[], page: number, count: number): T[] {
  if (order.length <= count) return [...order];
  const start = (page * count) % order.length;
  return Array.from({ length: count }, (_, index) => order[(start + index) % order.length]);
}
