import type { Code, Tool } from './data';
import { expiryOf } from './code-expiry';
import { fuzzyMatcher } from './fuzzy-search';

// Page « Tous les codes » : filtres et tri, façon tableau des départs.
// Fonctions pures, appelées côté client à chaque changement de filtre.

export type CodeSort = 'best' | 'recent' | 'votes';
export type CodeStatusFilter = 'all' | 'verified' | 'to_test';
/** Critères de confiance, cumulables : testé au paiement, vérifié ces 30 jours, 80 % de réussite ou plus. */
export type TrustFilter = 'payment' | 'recent' | 'reliable';
export type OfferKind = 'percent' | 'months' | 'trial' | 'amount' | 'other';
export type DeadlineFilter = '' | 'soon' | 'none';
export type CodeFilters = {
  query: string; category: string; status: CodeStatusFilter; sort: CodeSort;
  /** Slug de la famille de catégories (pastilles en haut de la page), vide pour toutes. */
  family: string;
  /** Slug de l'outil, vide pour tous. */
  tool: string;
  /** Slug du créateur, vide pour tous. */
  creator: string;
  trust: TrustFilter[];
  offer: OfferKind | '';
  deadline: DeadlineFilter;
  /** Seulement les codes ajoutés ces 7 derniers jours. */
  fresh: boolean;
};

export const DEFAULT_FILTERS: CodeFilters = {
  query: '', family: '', category: '', status: 'all', sort: 'best', tool: '', creator: '', trust: [], offer: '', deadline: '', fresh: false,
};

export const TRUSTS: { value: TrustFilter; label: string }[] = [
  { value: 'payment', label: 'Testé au paiement' },
  { value: 'recent', label: 'Vérifié ces 30 jours' },
  { value: 'reliable', label: 'Réussite ≥ 80 %' },
];
export const OFFERS: { value: OfferKind; label: string }[] = [
  { value: 'percent', label: 'Pourcentage' },
  { value: 'months', label: 'Mois offerts' },
  { value: 'trial', label: 'Essai gratuit' },
  { value: 'amount', label: 'Montant' },
  { value: 'other', label: 'Autre offre' },
];
export const DEADLINES: { value: Exclude<DeadlineFilter, ''>; label: string }[] = [
  { value: 'soon', label: 'Expire sous 7 jours' },
  { value: 'none', label: 'Sans date de fin' },
];
const STATUS_LABELS: Record<Exclude<CodeStatusFilter, 'all'>, string> = { verified: 'Vérifiés', to_test: 'À tester' };

const DAY = 86_400_000;
const RECENT_TEST_DAYS = 30;
const RELIABLE_SUCCESS = 80;
const FRESH_DAYS = 7;

function normalize(value: string) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }

/** Codes de l'accueil : les vérifiés d'abord (les mieux notés en tête), complétés par ceux à tester. */
export function featuredCodes(codes: Code[], limit = 6): Code[] {
  const rank = (a: Code, b: Code) => b.success - a.success || b.votes - a.votes;
  const verified = codes.filter(code => code.status === 'verified').sort(rank);
  const others = codes.filter(code => code.status !== 'verified').sort(rank);
  return [...verified, ...others].slice(0, limit);
}

/** Types d'offre lus dans le texte de la réduction (« 88 % + 4 mois offerts » est un pourcentage et des mois offerts). */
export function offerKinds(discount: string): OfferKind[] {
  const text = normalize(discount);
  const kinds: OfferKind[] = [];
  if (/\d\s*%/.test(text)) kinds.push('percent');
  if (/\bmois\b.*\b(offert|gratuit)/.test(text)) kinds.push('months');
  if (/\b(essai|trial)\b/.test(text)) kinds.push('trial');
  if (/(\d\s*(€|\$|eur\b|euros?\b)|[€$]\s*\d)/.test(text)) kinds.push('amount');
  return kinds.length ? kinds : ['other'];
}

function daysSince(date: string | null, now: number) { return date ? (now - Date.parse(date)) / DAY : Infinity; }

const trustTests: Record<TrustFilter, (code: Code, now: number) => boolean> = {
  // Comme le badge du coupon : seul un code vérifié affiche « Testé au paiement ».
  payment: code => code.status === 'verified' && Boolean(code.paymentTestedAt),
  recent: (code, now) => daysSince(code.lastTestedAt, now) <= RECENT_TEST_DAYS,
  reliable: code => code.success >= RELIABLE_SUCCESS,
};

function deadlineOf(code: Code, now: number): Exclude<DeadlineFilter, ''> | 'later' {
  // Même lecture que la ligne de date du coupon (jour à Paris) : aujourd'hui compte comme « bientôt ».
  const { state } = expiryOf(code.expiresOn, new Date(now));
  if (state === 'none') return 'none';
  return state === 'soon' || state === 'today' ? 'soon' : 'later';
}

type Facet = 'query' | 'family' | 'category' | 'status' | 'tool' | 'creator' | 'trust' | 'offer' | 'deadline' | 'fresh';

/** Le code passe-t-il tous les filtres, sauf celui qu'on met de côté (pour compter les options de ce filtre) ? */
type Lookups = { categoryOf: Map<string, string>; familyOf: Map<string, string | undefined> };
const lookups = (tools: Tool[]): Lookups => ({
  categoryOf: new Map(tools.map(tool => [tool.slug, tool.category])),
  familyOf: new Map(tools.map(tool => [tool.slug, tool.family])),
});

function matches(code: Code, filters: CodeFilters, { categoryOf, familyOf }: Lookups, now: number, skip?: Facet): boolean {
  const hit = skip === 'query' ? null : fuzzyMatcher(filters.query);
  return (!hit || [code.tool, code.creator, code.code].some(hit))
    && (skip === 'family' || !filters.family || familyOf.get(code.toolSlug) === filters.family)
    && (skip === 'category' || !filters.category || categoryOf.get(code.toolSlug) === filters.category)
    && (skip === 'status' || filters.status === 'all' || code.status === filters.status)
    && (skip === 'tool' || !filters.tool || code.toolSlug === filters.tool)
    && (skip === 'creator' || !filters.creator || code.creatorSlug === filters.creator)
    && (skip === 'trust' || filters.trust.every(trust => trustTests[trust](code, now)))
    && (skip === 'offer' || !filters.offer || offerKinds(code.discount).includes(filters.offer))
    && (skip === 'deadline' || !filters.deadline || deadlineOf(code, now) === filters.deadline)
    && (skip === 'fresh' || !filters.fresh || daysSince(code.createdAt, now) <= FRESH_DAYS);
}

/** Filtre (recherche, famille, catégorie, statut, outil, créateur, confiance, offre, échéance, nouveautés) puis trie les codes. */
export function filterCodes(codes: Code[], tools: Tool[], filters: CodeFilters, now = Date.now()): Code[] {
  const maps = lookups(tools);
  const kept = codes.filter(code => matches(code, filters, maps, now));
  const sorters: Record<CodeSort, (a: Code, b: Code) => number> = {
    best: (a, b) => b.success - a.success || b.votes - a.votes,
    votes: (a, b) => b.votes - a.votes || b.success - a.success,
    recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
  };
  return [...kept].sort(sorters[filters.sort]);
}

export type FacetCounts = {
  status: Record<CodeStatusFilter, number>;
  family: Record<string, number>;
  /** Codes de toutes les familles et catégories (pastille « Tous »), avec les autres filtres. */
  allFamilies: number;
  category: Record<string, number>;
  tool: Record<string, number>;
  creator: Record<string, number>;
  trust: Record<TrustFilter, number>;
  offer: Record<OfferKind, number>;
  deadline: Record<Exclude<DeadlineFilter, ''>, number>;
  fresh: number;
};

/**
 * Nombre de codes derrière chaque option, compte tenu des autres filtres déjà choisis
 * (mais pas du filtre lui-même, pour qu'on voie ce que donnerait un autre choix).
 * Pour la confiance, cumulable, on compte ce que donnerait l'ajout du critère.
 */
export function facetCounts(codes: Code[], tools: Tool[], filters: CodeFilters, now = Date.now()): FacetCounts {
  const maps = lookups(tools);
  const { categoryOf, familyOf } = maps;
  const without = (facet: Facet) => codes.filter(code => matches(code, filters, maps, now, facet));
  const tally = (list: Code[], key: (code: Code) => string | string[] | undefined) => {
    const out: Record<string, number> = {};
    for (const code of list) for (const value of [key(code)].flat()) if (value) out[value] = (out[value] ?? 0) + 1;
    return out;
  };
  const byStatus = without('status');
  const byTrust = without('trust').filter(code => filters.trust.every(trust => trustTests[trust](code, now)));
  const byOffer = tally(without('offer'), code => offerKinds(code.discount));
  const byDeadline = tally(without('deadline'), code => deadlineOf(code, now));
  return {
    status: {
      all: byStatus.length,
      verified: byStatus.filter(code => code.status === 'verified').length,
      to_test: byStatus.filter(code => code.status === 'to_test').length,
    },
    family: tally(without('family'), code => familyOf.get(code.toolSlug)),
    allFamilies: codes.filter(code => matches(code, { ...filters, family: '', category: '' }, maps, now)).length,
    category: tally(without('category'), code => categoryOf.get(code.toolSlug)),
    tool: tally(without('tool'), code => code.toolSlug),
    creator: tally(without('creator'), code => code.creatorSlug || undefined),
    trust: {
      payment: byTrust.filter(code => trustTests.payment(code, now)).length,
      recent: byTrust.filter(code => trustTests.recent(code, now)).length,
      reliable: byTrust.filter(code => trustTests.reliable(code, now)).length,
    },
    offer: { percent: 0, months: 0, trial: 0, amount: 0, other: 0, ...byOffer },
    deadline: { soon: byDeadline.soon ?? 0, none: byDeadline.none ?? 0 },
    fresh: without('fresh').filter(code => daysSince(code.createdAt, now) <= FRESH_DAYS).length,
  };
}

/** Lit les filtres depuis l'adresse, en ignorant les valeurs inconnues. */
export function parseFilters(params: Record<string, string | string[] | undefined>): CodeFilters {
  const one = (key: string) => { const value = params[key]; return typeof value === 'string' ? value : ''; };
  const pick = <T extends string>(value: string, allowed: readonly T[], fallback: T): T => (allowed.includes(value as T) ? value as T : fallback);
  const trusts = TRUSTS.map(trust => trust.value);
  const trust = one('trust').split(',').filter((value, index, all): value is TrustFilter => trusts.includes(value as TrustFilter) && all.indexOf(value) === index);
  return {
    query: one('q').slice(0, 80),
    family: one('family').slice(0, 80),
    category: one('category').slice(0, 80),
    status: pick(one('status'), ['all', 'verified', 'to_test'], 'all'),
    sort: pick(one('sort'), ['best', 'recent', 'votes'], 'best'),
    tool: one('tool').slice(0, 80),
    creator: one('creator').slice(0, 80),
    trust,
    offer: pick(one('offer'), ['', ...OFFERS.map(offer => offer.value)], ''),
    deadline: pick(one('deadline'), ['', 'soon', 'none'], ''),
    fresh: one('fresh') === '1',
  };
}

/** L'inverse de parseFilters : seuls les filtres qui changent quelque chose vont dans l'adresse. */
export function filtersToParams(filters: CodeFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.family) params.set('family', filters.family);
  if (filters.category) params.set('category', filters.category);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.sort !== 'best') params.set('sort', filters.sort);
  if (filters.tool) params.set('tool', filters.tool);
  if (filters.creator) params.set('creator', filters.creator);
  if (filters.trust.length) params.set('trust', filters.trust.join(','));
  if (filters.offer) params.set('offer', filters.offer);
  if (filters.deadline) params.set('deadline', filters.deadline);
  if (filters.fresh) params.set('fresh', '1');
  return params;
}

export type ActiveFilter = { key: string; label: string; patch: Partial<CodeFilters> };

/** Les filtres choisis, en pastilles : chacune dit ce qu'il faut changer pour la retirer. Le tri n'en est pas un. */
export function activeFilters(filters: CodeFilters, names: { tool: (slug: string) => string; creator: (slug: string) => string; family?: (slug: string) => string }): ActiveFilter[] {
  const pills: ActiveFilter[] = [];
  if (filters.query) pills.push({ key: 'q', label: `« ${filters.query} »`, patch: { query: '' } });
  if (filters.status !== 'all') pills.push({ key: 'status', label: STATUS_LABELS[filters.status], patch: { status: 'all' } });
  if (filters.family) pills.push({ key: 'family', label: names.family?.(filters.family) || filters.family, patch: { family: '', category: '' } });
  if (filters.category) pills.push({ key: 'category', label: filters.category, patch: { category: '' } });
  if (filters.tool) pills.push({ key: 'tool', label: names.tool(filters.tool) || filters.tool, patch: { tool: '' } });
  if (filters.creator) pills.push({ key: 'creator', label: names.creator(filters.creator) || filters.creator, patch: { creator: '' } });
  for (const trust of filters.trust) {
    pills.push({ key: `trust-${trust}`, label: TRUSTS.find(t => t.value === trust)?.label ?? trust, patch: { trust: filters.trust.filter(t => t !== trust) } });
  }
  if (filters.offer) pills.push({ key: 'offer', label: OFFERS.find(o => o.value === filters.offer)?.label ?? filters.offer, patch: { offer: '' } });
  if (filters.deadline) pills.push({ key: 'deadline', label: DEADLINES.find(d => d.value === filters.deadline)?.label ?? filters.deadline, patch: { deadline: '' } });
  if (filters.fresh) pills.push({ key: 'fresh', label: 'Ajoutés cette semaine', patch: { fresh: false } });
  return pills;
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

export type LastChance = { code: Code; daysLeft: number; label: string };

/** Bandeau « Dernière chance » : les codes dont la date de fin tombe dans les 7 jours, les plus pressés d'abord. */
export function lastChanceCodes(codes: Code[], now = Date.now(), limit = 4): LastChance[] {
  const out: LastChance[] = [];
  for (const code of codes) {
    const expiry = expiryOf(code.expiresOn, new Date(now));
    if (expiry.state === 'soon' || expiry.state === 'today') out.push({ code, daysLeft: expiry.daysLeft, label: expiry.label });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft || b.code.success - a.code.success).slice(0, limit);
}

export type Relax = ActiveFilter & { count: number };

/**
 * Aucun résultat : quels filtres retirer pour en retrouver ? Chaque filtre actif, avec le nombre de codes
 * qu'on aurait sans lui, les plus utiles d'abord (seulement ceux qui en redonnent).
 */
export function relaxSuggestions(codes: Code[], tools: Tool[], filters: CodeFilters, pills: ActiveFilter[], now = Date.now(), limit = 3): Relax[] {
  return pills
    .map(pill => ({ ...pill, count: filterCodes(codes, tools, { ...filters, ...pill.patch }, now).length }))
    .filter(pill => pill.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Aucun filtre choisi (le tri n'en est pas un) : la page montre alors les rangées thématiques avant la liste. */
export function isBrowsing(filters: CodeFilters): boolean {
  return filtersToParams({ ...filters, sort: DEFAULT_FILTERS.sort }).toString() === '';
}

export type BrowseRow = {
  key: string; title: string;
  /** Codes de la rangée, les plus fiables d'abord. */
  codes: Code[];
  /** Nombre total de codes derrière « Tout voir ». */
  total: number;
  /** Ce que « Tout voir » change dans les filtres. */
  patch: Partial<CodeFilters>;
};

const ROW_MIN = 3;
const ROW_MAX = 12;
const ROW_FAMILIES = 4;
const ROW_CREATORS = 2;

/**
 * Rangées thématiques de la page Codes, façon catalogue : testés au paiement, nouveautés, les plus votés,
 * les familles les plus fournies, puis les créateurs qui donnent le plus de codes.
 * Une rangée n'apparaît que si elle a au moins trois codes, sans les reprendre tous.
 */
export function browseRows(codes: Code[], tools: Tool[], families: { slug: string; name: string }[], now = Date.now()): BrowseRow[] {
  const run = (patch: Partial<CodeFilters>) => filterCodes(codes, tools, { ...DEFAULT_FILTERS, ...patch }, now);
  const rows: BrowseRow[] = [];
  const add = (key: string, title: string, patch: Partial<CodeFilters>, list = run(patch)) => {
    // Une rangée qui reprend tous les codes n'apprend rien : elle est laissée de côté.
    if (list.length >= ROW_MIN && list.length < codes.length) rows.push({ key, title, codes: list.slice(0, ROW_MAX), total: list.length, patch });
  };
  add('payment', 'Testés au paiement', { trust: ['payment'] });
  add('fresh', 'Ajoutés cette semaine', { fresh: true });
  add('votes', 'Les plus votés', { sort: 'votes' }, run({ sort: 'votes' }).filter(code => code.votes > 0));

  const familyOf = new Map(tools.map(tool => [tool.slug, tool.family]));
  const perFamily = new Map<string, number>();
  for (const code of codes) { const family = familyOf.get(code.toolSlug); if (family) perFamily.set(family, (perFamily.get(family) ?? 0) + 1); }
  families
    .filter(family => (perFamily.get(family.slug) ?? 0) >= ROW_MIN)
    .sort((a, b) => (perFamily.get(b.slug) ?? 0) - (perFamily.get(a.slug) ?? 0) || a.name.localeCompare(b.name, 'fr'))
    .slice(0, ROW_FAMILIES)
    .forEach(family => add(`family-${family.slug}`, family.name, { family: family.slug }));

  const perCreator = new Map<string, { name: string; count: number }>();
  for (const code of codes) {
    if (!code.creatorSlug) continue; // code trouvé par Merkod : pas de créateur
    const entry = perCreator.get(code.creatorSlug) ?? { name: code.creator, count: 0 };
    entry.count += 1;
    perCreator.set(code.creatorSlug, entry);
  }
  [...perCreator]
    .filter(([, entry]) => entry.count >= ROW_MIN)
    .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name, 'fr'))
    .slice(0, ROW_CREATORS)
    .forEach(([slug, entry]) => add(`creator-${slug}`, `Donnés par ${entry.name}`, { creator: slug }));
  return rows;
}
