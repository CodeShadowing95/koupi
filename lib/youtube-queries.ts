// Formulations de la recherche de codes sur YouTube (ADR-0033). Chaque recherche d'un même outil prend la suivante :
// une formulation jamais essayée remonte sur l'année, une formulation déjà essayée ne demande que les vidéos publiées depuis.

/** Formulations essayées dans cet ordre : en français d'abord, puis en anglais (beaucoup de créateurs français les emploient aussi). */
export const QUERY_VARIANTS = ['code promo', 'code réduction', 'promo code', 'discount code'] as const;
export type QueryVariant = (typeof QUERY_VARIANTS)[number];

/** On ne remonte pas plus loin qu'un an : un code plus ancien a peu de chances de marcher encore. */
export const SEARCH_DAYS = 365;
const DAY = 24 * 60 * 60 * 1000;

export type PastSearch = { variant: string; searchedAt: Date };

/**
 * Prochaine formulation pour un outil (ou le nom d'une catégorie), d'après ses recherches passées.
 * D'abord une formulation jamais essayée (vidéos de l'année), sinon celle essayée il y a le plus longtemps,
 * limitée aux vidéos publiées depuis cette dernière fois.
 */
export function nextQuery(subject: string, past: PastSearch[], now: Date): { variant: QueryVariant; query: string; publishedAfter: Date } {
  const yearAgo = new Date(now.getTime() - SEARCH_DAYS * DAY);
  const lastUse = new Map<string, Date>();
  for (const search of past) {
    const previous = lastUse.get(search.variant);
    if (!previous || search.searchedAt > previous) lastUse.set(search.variant, search.searchedAt);
  }
  const unused = QUERY_VARIANTS.find(variant => !lastUse.has(variant));
  if (unused) return { variant: unused, query: `${subject} ${unused}`, publishedAfter: yearAgo };
  const oldest = [...QUERY_VARIANTS].sort((a, b) => lastUse.get(a)!.getTime() - lastUse.get(b)!.getTime())[0];
  const since = lastUse.get(oldest)!;
  return { variant: oldest, query: `${subject} ${oldest}`, publishedAfter: since > yearAgo ? since : yearAgo };
}
