import type { Code, Tool } from './data';

// Page « Tous les codes » : filtres et tri, façon tableau des départs.
// Fonctions pures, appelées côté client à chaque changement de filtre.

export type CodeSort = 'best' | 'recent' | 'votes';
export type CodeStatusFilter = 'all' | 'verified' | 'to_test';
export type CodeFilters = { query: string; category: string; status: CodeStatusFilter; sort: CodeSort };

export const DEFAULT_FILTERS: CodeFilters = { query: '', category: '', status: 'all', sort: 'best' };

function normalize(value: string) { return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }

/** Codes de l'accueil : les vérifiés d'abord (les mieux notés en tête), complétés par ceux à tester. */
export function featuredCodes(codes: Code[], limit = 6): Code[] {
  const rank = (a: Code, b: Code) => b.success - a.success || b.votes - a.votes;
  const verified = codes.filter(code => code.status === 'verified').sort(rank);
  const others = codes.filter(code => code.status !== 'verified').sort(rank);
  return [...verified, ...others].slice(0, limit);
}

/** Filtre (outil, créateur ou code, catégorie, statut) puis trie les codes. */
export function filterCodes(codes: Code[], tools: Tool[], filters: CodeFilters): Code[] {
  const categoryOf = new Map(tools.map(tool => [tool.slug, tool.category]));
  const q = normalize(filters.query);
  const kept = codes.filter(code =>
    (!q || [code.tool, code.creator, code.code].some(field => normalize(field).includes(q)))
    && (!filters.category || categoryOf.get(code.toolSlug) === filters.category)
    && (filters.status === 'all' || code.status === filters.status));
  const sorters: Record<CodeSort, (a: Code, b: Code) => number> = {
    best: (a, b) => b.success - a.success || b.votes - a.votes,
    votes: (a, b) => b.votes - a.votes || b.success - a.success,
    recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
  };
  return [...kept].sort(sorters[filters.sort]);
}

/** Lit les filtres depuis l'adresse (?q=&category=&status=&sort=), en ignorant les valeurs inconnues. */
export function parseFilters(params: Record<string, string | string[] | undefined>): CodeFilters {
  const one = (key: string) => { const value = params[key]; return typeof value === 'string' ? value : ''; };
  const status = one('status');
  const sort = one('sort');
  return {
    query: one('q').slice(0, 80),
    category: one('category').slice(0, 80),
    status: status === 'verified' || status === 'to_test' ? status : 'all',
    sort: sort === 'recent' || sort === 'votes' ? sort : 'best',
  };
}

/**
 * Nombre court pour le bouton « Voir plus de codes » : exact sous 100, puis « +99 »,
 * « +1K », « +2K »… à partir de 1 000 et « +1M », « +2M »… à partir d'un million.
 */
export function compactCount(count: number): string {
  if (count >= 1_000_000) return `+${Math.floor(count / 1_000_000)}M`;
  if (count >= 1_000) return `+${Math.floor(count / 1_000)}K`;
  if (count >= 100) return '+99';
  return String(Math.max(0, Math.floor(count)));
}
