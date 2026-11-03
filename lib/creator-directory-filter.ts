// Filtres, tri et compteurs de l'annuaire des créateurs (/creators).
// Sans base ni réseau : importable par les composants client.
import type { CreatorPlatform } from './creator-accounts-display';
import type { Code } from './data';

export type DirectoryEntry = {
  slug: string; name: string; level: Code['creatorLevel']; bio: string | null;
  codes: number; tools: string[]; themes: string[]; platforms: CreatorPlatform[]; copies: number;
};

export type DirectorySort = 'copies' | 'codes' | 'name';
export type DirectoryFilter = { platform?: string; theme?: string; query?: string; sort?: DirectorySort };
export const DIRECTORY_SORTS: DirectorySort[] = ['copies', 'codes', 'name'];

function normalize(value: string) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }

type DirectoryFacet = 'platform' | 'theme';

function keep(entry: DirectoryEntry, filter: DirectoryFilter, skip?: DirectoryFacet): boolean {
  const q = normalize(filter.query ?? '');
  return (skip === 'platform' || !filter.platform || entry.platforms.includes(filter.platform as CreatorPlatform))
    && (skip === 'theme' || !filter.theme || entry.themes.includes(filter.theme))
    // La recherche porte sur le nom du créateur et les outils dont il donne un code.
    && (!q || [entry.name, ...entry.tools].some(field => normalize(field).includes(q)));
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

/** Nombre de créateurs derrière chaque réseau et chaque thème, compte tenu des autres filtres (mais pas du sien). */
export function directoryCounts(entries: DirectoryEntry[], filter: DirectoryFilter): { platform: Record<string, number>; theme: Record<string, number>; all: { platform: number; theme: number } } {
  const tally = (facet: DirectoryFacet, values: (entry: DirectoryEntry) => string[]) => {
    const list = entries.filter(entry => keep(entry, filter, facet));
    const out: Record<string, number> = {};
    for (const entry of list) for (const value of values(entry)) out[value] = (out[value] ?? 0) + 1;
    return { out, total: list.length };
  };
  const platform = tally('platform', entry => entry.platforms);
  const theme = tally('theme', entry => entry.themes);
  return { platform: platform.out, theme: theme.out, all: { platform: platform.total, theme: theme.total } };
}

/** Lit les filtres dans l'adresse ; un réseau ou un thème absent de l'annuaire est ignoré. */
export function parseDirectoryFilter(params: Record<string, string | string[] | undefined>, options: { platforms: string[]; themes: string[] }): Required<DirectoryFilter> {
  const one = (key: string) => { const value = params[key]; return typeof value === 'string' ? value : ''; };
  return {
    platform: options.platforms.includes(one('platform')) ? one('platform') : '',
    theme: options.themes.includes(one('theme')) ? one('theme') : '',
    query: one('q').slice(0, 80),
    sort: DIRECTORY_SORTS.includes(one('sort') as DirectorySort) ? one('sort') as DirectorySort : 'copies',
  };
}

/** L'inverse : seuls les filtres qui changent quelque chose vont dans l'adresse. */
export function directoryParams(filter: DirectoryFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.query?.trim()) params.set('q', filter.query.trim());
  if (filter.platform) params.set('platform', filter.platform);
  if (filter.theme) params.set('theme', filter.theme);
  if (filter.sort && filter.sort !== 'copies') params.set('sort', filter.sort);
  return params;
}

/** Choix proposés dans les filtres : seulement les réseaux et thèmes présents, du plus fréquent au moins fréquent. */
export function directoryOptions(entries: DirectoryEntry[]): { platforms: CreatorPlatform[]; themes: string[] } {
  const rank = <T extends string>(values: T[]) => {
    const count = new Map<T, number>();
    for (const value of values) count.set(value, (count.get(value) ?? 0) + 1);
    return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr')).map(([value]) => value);
  };
  return { platforms: rank(entries.flatMap(entry => entry.platforms)), themes: rank(entries.flatMap(entry => entry.themes)) };
}
