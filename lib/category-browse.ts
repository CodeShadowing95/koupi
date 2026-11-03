import type { Code, Tool } from './data';
import { DEFAULT_FILTERS, facetCounts, filterCodes, type CodeSort, type CodeStatusFilter } from './codes-board';

// Page d'une catégorie : recherche, statut, outil et tri pour affiner les codes et les outils listés.
// On réutilise les filtres de « Tous les codes » (lib/codes-board.ts), limités aux outils de la catégorie.
// Fonctions pures, appelées au rendu serveur puis côté client à chaque changement.

export type CategoryFilters = { query: string; status: CodeStatusFilter; tool: string; sort: CodeSort };
export const DEFAULT_CATEGORY_FILTERS: CategoryFilters = { query: '', status: 'all', tool: '', sort: 'best' };

const STATUSES: CodeStatusFilter[] = ['all', 'verified', 'to_test'];
const SORTS: CodeSort[] = ['best', 'votes', 'recent'];

function normalize(value: string) { return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }

/** Lit les filtres dans l'adresse. Une valeur inconnue (outil d'une autre catégorie, statut bricolé) est ignorée. */
export function parseCategoryFilters(params: Record<string, string | string[] | undefined>, toolSlugs: string[]): CategoryFilters {
  const one = (key: string) => { const value = params[key]; return typeof value === 'string' ? value : ''; };
  const pick = <T extends string>(value: string, allowed: readonly T[], fallback: T): T => (allowed.includes(value as T) ? value as T : fallback);
  return {
    query: one('q').slice(0, 80),
    status: pick(one('status'), STATUSES, 'all'),
    tool: toolSlugs.includes(one('tool')) ? one('tool') : '',
    sort: pick(one('sort'), SORTS, 'best'),
  };
}

/** L'inverse : seuls les filtres qui changent quelque chose vont dans l'adresse. */
export function categoryParams(filters: CategoryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.tool) params.set('tool', filters.tool);
  if (filters.sort !== 'best') params.set('sort', filters.sort);
  return params;
}

export type CategoryView = {
  codes: Code[];
  tools: Tool[];
  /** Nombre de codes derrière chaque statut et chaque outil, compte tenu des autres filtres. */
  counts: { status: Record<CodeStatusFilter, number>; tool: Record<string, number> };
};

/**
 * Codes et outils de la catégorie qui passent les filtres.
 * Un outil reste affiché si son nom correspond à la recherche ou s'il a au moins un code retenu ;
 * les outils sont rangés du plus de codes retenus au moins, puis par nom.
 */
export function browseCategory(codes: Code[], tools: Tool[], filters: CategoryFilters, now = Date.now()): CategoryView {
  const slugs = new Set(tools.map(tool => tool.slug));
  const own = codes.filter(code => slugs.has(code.toolSlug));
  const full = { ...DEFAULT_FILTERS, query: filters.query, status: filters.status, tool: filters.tool, sort: filters.sort };
  const kept = filterCodes(own, tools, full, now);
  const facets = facetCounts(own, tools, full, now);

  const perTool = new Map<string, number>();
  for (const code of kept) perTool.set(code.toolSlug, (perTool.get(code.toolSlug) ?? 0) + 1);
  const q = normalize(filters.query);
  // Un filtre de statut ne retire pas l'outil cherché par son nom : on cache seulement ceux sans code retenu.
  const nameHit = (tool: Tool) => q !== '' && filters.status === 'all' && normalize(tool.name).includes(q);
  const shownTools = tools
    .filter(tool => (!filters.tool || tool.slug === filters.tool) && ((perTool.get(tool.slug) ?? 0) > 0 || nameHit(tool)))
    .sort((a, b) => (perTool.get(b.slug) ?? 0) - (perTool.get(a.slug) ?? 0) || a.name.localeCompare(b.name, 'fr'));

  return { codes: kept, tools: shownTools, counts: { status: facets.status, tool: facets.tool } };
}

/** Y a-t-il au moins un filtre choisi ? (pour proposer « Tout afficher »). */
export function hasCategoryFilter(filters: CategoryFilters): boolean {
  return categoryParams(filters).toString() !== '';
}
