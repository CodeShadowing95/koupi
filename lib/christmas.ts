// Page « Codes promo de Noël » (/noel) : une adresse fixe, mise à jour chaque année, comme /black-friday.

/** Année du Noël montré : celui de l'année en cours, et le Noël passé jusqu'à l'Épiphanie (6 janvier). */
export function christmasYear(now: Date): number {
  const year = now.getUTCFullYear();
  return now.getUTCMonth() === 0 && now.getUTCDate() <= 6 ? year - 1 : year;
}

/** Le 25 décembre, à minuit UTC. */
export function christmasDate(year: number): Date {
  return new Date(Date.UTC(year, 11, 25));
}
