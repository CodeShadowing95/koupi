import type { Code, Tool } from './data';
import { expiryOf } from './code-expiry';

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
  query: '', category: '', status: 'all', sort: 'best', tool: '', creator: '', trust: [], offer: '', deadline: '', fresh: false,
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

type Facet = 'query' | 'category' | 'status' | 'tool' | 'creator' | 'trust' | 'offer' | 'deadline' | 'fresh';

/** Le code passe-t-il tous les filtres, sauf celui qu'on met de côté (pour compter les options de ce filtre) ? */
function matches(code: Code, filters: CodeFilters, categoryOf: Map<string, string>, now: number, skip?: Facet): boolean {
  const q = skip === 'query' ? '' : normalize(filters.query);
  return (!q || [code.tool, code.creator, code.code].some(field => normalize(field).includes(q)))
    && (skip === 'category' || !filters.category || categoryOf.get(code.toolSlug) === filters.category)
    && (skip === 'status' || filters.status === 'all' || code.status === filters.status)
    && (skip === 'tool' || !filters.tool || code.toolSlug === filters.tool)
    && (skip === 'creator' || !filters.creator || code.creatorSlug === filters.creator)
    && (skip === 'trust' || filters.trust.every(trust => trustTests[trust](code, now)))
    && (skip === 'offer' || !filters.offer || offerKinds(code.discount).includes(filters.offer))
    && (skip === 'deadline' || !filters.deadline || deadlineOf(code, now) === filters.deadline)
    && (skip === 'fresh' || !filters.fresh || daysSince(code.createdAt, now) <= FRESH_DAYS);
}

/** Filtre (recherche, catégorie, statut, outil, créateur, confiance, offre, échéance, nouveautés) puis trie les codes. */
export function filterCodes(codes: Code[], tools: Tool[], filters: CodeFilters, now = Date.now()): Code[] {
  const categoryOf = new Map(tools.map(tool => [tool.slug, tool.category]));
  const kept = codes.filter(code => matches(code, filters, categoryOf, now));
  const sorters: Record<CodeSort, (a: Code, b: Code) => number> = {
    best: (a, b) => b.success - a.success || b.votes - a.votes,
    votes: (a, b) => b.votes - a.votes || b.success - a.success,
    recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
  };
  return [...kept].sort(sorters[filters.sort]);
}

export type FacetCounts = {
  status: Record<CodeStatusFilter, number>;
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
  const categoryOf = new Map(tools.map(tool => [tool.slug, tool.category]));
  const without = (facet: Facet) => codes.filter(code => matches(code, filters, categoryOf, now, facet));
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
    category: tally(without('category'), code => categoryOf.get(code.toolSlug)),
    tool: tally(without('tool'), code => code.toolSlug),
    creator: tally(without('creator'), code => code.creatorSlug),
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
export function activeFilters(filters: CodeFilters, names: { tool: (slug: string) => string; creator: (slug: string) => string }): ActiveFilter[] {
  const pills: ActiveFilter[] = [];
  if (filters.query) pills.push({ key: 'q', label: `« ${filters.query} »`, patch: { query: '' } });
  if (filters.status !== 'all') pills.push({ key: 'status', label: STATUS_LABELS[filters.status], patch: { status: 'all' } });
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
