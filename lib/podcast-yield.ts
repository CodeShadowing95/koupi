// Rendement des podcasts suivis : lesquels donnent des codes copiés, lesquels ne donnent plus rien.
// Sans base ni réseau : importable par les composants client.

/** Un podcast qui n'a donné aucun code depuis ce nombre de jours peut être mis en pause. */
export const QUIET_DAYS = 90;
const DAY = 86_400_000;

type Yield = { title: string; createdAt: string; codesFound: number; codesPublished: number; copiesThisMonth: number; lastCodeAt: string | null };

/** Suivi depuis au moins 90 jours, et aucun code trouvé depuis 90 jours. */
export function isQuiet(podcast: Pick<Yield, 'createdAt' | 'lastCodeAt'>, now: Date): boolean {
  const limit = now.getTime() - QUIET_DAYS * DAY;
  if (new Date(podcast.createdAt).getTime() > limit) return false;
  return !podcast.lastCodeAt || new Date(podcast.lastCodeAt).getTime() <= limit;
}

/** Du plus rentable au moins rentable : copies du mois, puis codes publiés, puis codes trouvés, puis le nom. */
export function compareYield(a: Yield, b: Yield): number {
  return b.copiesThisMonth - a.copiesThisMonth || b.codesPublished - a.codesPublished || b.codesFound - a.codesFound
    || a.title.localeCompare(b.title, 'fr');
}

/** Valeur unique pour trier une colonne « Rendement ». */
export function yieldScore(podcast: Pick<Yield, 'codesFound' | 'codesPublished' | 'copiesThisMonth'>): number {
  return podcast.copiesThisMonth * 1_000_000 + podcast.codesPublished * 1_000 + podcast.codesFound;
}
