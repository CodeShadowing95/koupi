// Page « Codes promo des soldes d'hiver » (/soldes) : une adresse fixe, mise à jour chaque année, comme /black-friday et /noel.

const DAY = 86_400_000;

/**
 * Début des soldes d'hiver en France : le deuxième mercredi de janvier, avancé au premier mercredi quand le deuxième
 * tombe après le 12 (Code de commerce, art. D310-15-2). Minuit UTC ; l'heure d'ouverture (8 h) est dite dans le texte.
 * Quelques départements de l'Est ont leurs propres dates : la page parle de « la plupart des départements ».
 */
export function winterSalesStart(year: number): Date {
  const first = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const firstWednesday = 1 + ((3 - first + 7) % 7);
  const second = firstWednesday + 7;
  return new Date(Date.UTC(year, 0, second > 12 ? firstWednesday : second));
}

/** Dernier jour des soldes d'hiver : ils durent quatre semaines, du mercredi au mardi. */
export function winterSalesEnd(year: number): Date {
  return new Date(winterSalesStart(year).getTime() + 27 * DAY);
}

/** Année des soldes montrés : les soldes en cours jusqu'à leur dernier jour, puis ceux de janvier prochain. */
export function salesYear(now: Date): number {
  const year = now.getUTCFullYear();
  const today = Date.UTC(year, now.getUTCMonth(), now.getUTCDate());
  return today <= winterSalesEnd(year).getTime() ? year : year + 1;
}
