// Filtres, tri et compteurs de l'annuaire des créateurs (/creators).
// Sans base ni réseau : importable par les composants client.
import type { CreatorPlatform } from './creator-accounts-display';
import type { Code } from './data';
import { fuzzyMatcher } from './fuzzy-search';

/** Ce que la carte du créateur montre en premier : son meilleur code, prêt à copier. */
export type DirectoryTop = Pick<Code, 'id' | 'code' | 'tool' | 'toolSlug' | 'creator' | 'discount'> & { link: string };

export type DirectoryEntry = {
  slug: string; name: string; level: Code['creatorLevel']; bio: string | null;
  codes: number; tools: string[]; themes: string[]; platforms: CreatorPlatform[]; copies: number;
  /** Familles de catégories (slugs) des outils dont il donne un code. */
  families: string[];
  /** Les outils dont il donne un code, le plus fort d'abord, pour les logos de la carte. */
  logos: { slug: string; name: string }[];
  top: DirectoryTop;
};

export type DirectorySort = 'copies' | 'codes' | 'name';
export type DirectoryFilter = { platform?: string; family?: string; query?: string; sort?: DirectorySort };
export const DIRECTORY_SORTS: DirectorySort[] = ['copies', 'codes', 'name'];

type DirectoryFacet = 'platform' | 'family';

function keep(entry: DirectoryEntry, filter: DirectoryFilter, skip?: DirectoryFacet): boolean {
  const hit = fuzzyMatcher(filter.query ?? '');
  return (skip === 'platform' || !filter.platform || entry.platforms.includes(filter.platform as CreatorPlatform))
    && (skip === 'family' || !filter.family || entry.families.includes(filter.family))
    // La recherche porte sur le nom du créateur et les outils dont il donne un code.
    && (!hit || [entry.name, ...entry.tools].some(hit));
}

const sorters: Record<DirectorySort, (a: DirectoryEntry, b: DirectoryEntry) => number> = {
  copies: (a, b) => b.copies - a.copies || b.codes - a.codes || a.name.localeCompare(b.name, 'fr'),
  codes: (a, b) => b.codes - a.codes || b.copies - a.copies || a.name.localeCompare(b.name, 'fr'),
  name: (a, b) => a.name.localeCompare(b.name, 'fr'),
};

/** Créateurs qui passent les filtres, dans l'ordre demandé (le plus copié ce mois-ci par défaut). */
export function filterDirectory(entries: DirectoryEntry[], filter: DirectoryFilter): DirectoryEntry[] {
  return entries.filter(entry => keep(entry, filter)).sort(sorters[filter.sort ?? 'copies']);
}

/** Nombre de créateurs derrière chaque réseau et chaque famille, compte tenu des autres filtres (mais pas du sien). */
export function directoryCounts(entries: DirectoryEntry[], filter: DirectoryFilter): { platform: Record<string, number>; family: Record<string, number>; all: { platform: number; family: number } } {
  const tally = (facet: DirectoryFacet, values: (entry: DirectoryEntry) => string[]) => {
    const list = entries.filter(entry => keep(entry, filter, facet));
    const out: Record<string, number> = {};
    for (const entry of list) for (const value of values(entry)) out[value] = (out[value] ?? 0) + 1;
    return { out, total: list.length };
  };
  const platform = tally('platform', entry => entry.platforms);
  const family = tally('family', entry => entry.families);
  return { platform: platform.out, family: family.out, all: { platform: platform.total, family: family.total } };
}

/** Lit les filtres dans l'adresse ; un réseau ou une famille absents de l'annuaire sont ignorés. */
export function parseDirectoryFilter(params: Record<string, string | string[] | undefined>, options: { platforms: string[]; families: string[] }): Required<DirectoryFilter> {
  const one = (key: string) => { const value = params[key]; return typeof value === 'string' ? value : ''; };
  return {
    platform: options.platforms.includes(one('platform')) ? one('platform') : '',
    family: options.families.includes(one('family')) ? one('family') : '',
    query: one('q').slice(0, 80),
    sort: DIRECTORY_SORTS.includes(one('sort') as DirectorySort) ? one('sort') as DirectorySort : 'copies',
  };
}

/** L'inverse : seuls les filtres qui changent quelque chose vont dans l'adresse. */
export function directoryParams(filter: DirectoryFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.query?.trim()) params.set('q', filter.query.trim());
  if (filter.platform) params.set('platform', filter.platform);
  if (filter.family) params.set('family', filter.family);
  if (filter.sort && filter.sort !== 'copies') params.set('sort', filter.sort);
  return params;
}

/** Choix proposés dans les filtres : seulement les réseaux et familles présents, du plus fréquent au moins fréquent. */
export function directoryOptions(entries: DirectoryEntry[]): { platforms: CreatorPlatform[]; families: string[] } {
  const rank = <T extends string>(values: T[]) => {
    const count = new Map<T, number>();
    for (const value of values) count.set(value, (count.get(value) ?? 0) + 1);
    return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr')).map(([value]) => value);
  };
  return { platforms: rank(entries.flatMap(entry => entry.platforms)), families: rank(entries.flatMap(entry => entry.families)) };
}

/**
 * Force d'une offre pour la classer : le plus grand pourcentage, puis les mois offerts (un mois vaut 5 points).
 * « -88 % + 4 mois offerts » vaut 108, « 3 mois offerts » 15, « Offre du créateur » 0.
 */
export function offerScore(discount: string): number {
  const percents = [...discount.matchAll(/(\d{1,3})\s?%/g)].map(match => Number(match[1])).filter(value => value <= 100);
  const months = discount.match(/(\d+)\s*mois/i);
  return Math.max(0, ...percents) + (months ? Number(months[1]) * 5 : 0);
}

/** Le podium : les 3 créateurs les plus copiés ce mois-ci, seulement ceux qui ont au moins une copie. */
export function directoryPodium(entries: DirectoryEntry[], size = 3): DirectoryEntry[] {
  return entries.filter(entry => entry.copies > 0).sort((a, b) => b.copies - a.copies || b.codes - a.codes || a.name.localeCompare(b.name, 'fr')).slice(0, size);
}
