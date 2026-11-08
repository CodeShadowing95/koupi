import type { Category, Code, Family, Tool } from './data';
import { DEFAULT_FILTERS, filterCodes, type CodeFilters } from './codes-board';

// Page « Explorer » : on arrive, on cherche, on prend son code, on repart.
// Une colonne de rayons à gauche (Tout, Nouveautés, Testés au paiement…, puis les familles et les créateurs),
// une barre de catégories en pastilles et la grille des coupons. Fonctions pures, appelées côté client.

/** Rayons de la colonne de gauche, au-dessus des familles. */
export type Shelf = 'all' | 'fresh' | 'payment' | 'votes' | 'soon';
/** short : nom sous l'icône quand la colonne est réduite. */
export const SHELVES: { value: Shelf; label: string; short: string }[] = [
  { value: 'all', label: 'Tout le comptoir', short: 'Tout' },
  { value: 'fresh', label: 'Nouveautés', short: 'Nouveau' },
  { value: 'payment', label: 'Testés au paiement', short: 'Payés' },
  { value: 'votes', label: 'Les plus votés', short: 'Votés' },
  { value: 'soon', label: 'Dernière chance', short: 'Bientôt' },
];

/** Premier mot d'un nom de famille (« Hébergement, domaines et cloud » → « Hébergement »), pour la colonne réduite. */
export function shortName(name: string): string {
  return name.split(/[\s,]+/)[0] || name;
}

export type ExploreState = {
  shelf: Shelf;
  /** Slug de la famille choisie dans la colonne, vide pour toutes. */
  family: string;
  /** Nom de la catégorie choisie dans la barre de pastilles (comme le filtre de la page Codes), vide pour toutes. */
  category: string;
  /** Slug du créateur choisi dans la colonne, vide pour tous. */
  creator: string;
  query: string;
};

export const DEFAULT_EXPLORE: ExploreState = { shelf: 'all', family: '', category: '', creator: '', query: '' };

const SHELF_FILTERS: Record<Shelf, Partial<CodeFilters>> = {
  all: {},
  fresh: { fresh: true, sort: 'recent' },
  payment: { trust: ['payment'] },
  votes: { sort: 'votes' },
  soon: { deadline: 'soon' },
};

/** Les filtres de la page Codes qui correspondent à ce qu'on regarde. */
export function exploreFilters(state: ExploreState): CodeFilters {
  return { ...DEFAULT_FILTERS, ...SHELF_FILTERS[state.shelf], family: state.family, category: state.category, creator: state.creator, query: state.query };
}

/** Les codes à afficher, dans l'ordre du rayon. « Les plus votés » ne garde que les codes qui ont des votes. */
export function exploreCodes(codes: Code[], tools: Tool[], state: ExploreState, now = Date.now()): Code[] {
  const list = filterCodes(codes, tools, exploreFilters(state), now);
  return state.shelf === 'votes' ? list.filter(code => code.votes > 0) : list;
}

export type Counted = { slug: string; name: string; count: number };

/** Familles qui ont au moins un code, dans l'ordre du menu, avec leur nombre de codes. */
export function familyEntries(codes: Code[], tools: Tool[], families: Family[]): Counted[] {
  const familyOf = new Map(tools.map(tool => [tool.slug, tool.family]));
  const count = new Map<string, number>();
  for (const code of codes) {
    const family = familyOf.get(code.toolSlug);
    if (family) count.set(family, (count.get(family) ?? 0) + 1);
  }
  return families.filter(family => count.has(family.slug)).map(family => ({ ...family, count: count.get(family.slug) ?? 0 }));
}

/** Pastilles de catégories : celles de la famille choisie (ou toutes), les plus fournies d'abord. */
export function categoryChips(codes: Code[], tools: Tool[], categories: Pick<Category, 'slug' | 'name' | 'family'>[], family: string): Counted[] {
  const categoryOf = new Map(tools.map(tool => [tool.slug, tool.category]));
  const count = new Map<string, number>();
  for (const code of codes) {
    const category = categoryOf.get(code.toolSlug);
    if (category) count.set(category, (count.get(category) ?? 0) + 1);
  }
  return categories
    .filter(category => count.has(category.name) && (!family || category.family === family))
    .map(({ slug, name }) => ({ slug, name, count: count.get(name) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'));
}

/** Créateurs de la colonne, comme les abonnements : ceux qui donnent le plus de codes. */
export function topCreators(codes: Code[], limit = 6): (Counted & { level: Code['creatorLevel'] })[] {
  const byCreator = new Map<string, Counted & { level: Code['creatorLevel'] }>();
  for (const code of codes) {
    const entry = byCreator.get(code.creatorSlug) ?? { slug: code.creatorSlug, name: code.creator, count: 0, level: code.creatorLevel };
    entry.count += 1;
    byCreator.set(code.creatorSlug, entry);
  }
  return [...byCreator.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr')).slice(0, limit);
}

/** Lit l'adresse (?shelf=fresh&family=video&category=Montage&creator=ana&q=vpn). Une valeur inconnue revient au défaut. */
export function parseExplore(params: Record<string, string | string[] | undefined>): ExploreState {
  const one = (key: string) => { const value = params[key]; return typeof value === 'string' ? value.slice(0, 80) : ''; };
  const shelf = one('shelf');
  return {
    shelf: SHELVES.some(item => item.value === shelf) ? shelf as Shelf : 'all',
    family: one('family'),
    category: one('category'),
    creator: one('creator'),
    query: one('q'),
  };
}

/** L'inverse de parseExplore : seules les valeurs qui changent quelque chose vont dans l'adresse. */
export function exploreToParams(state: ExploreState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.shelf !== 'all') params.set('shelf', state.shelf);
  if (state.family) params.set('family', state.family);
  if (state.category) params.set('category', state.category);
  if (state.creator) params.set('creator', state.creator);
  if (state.query) params.set('q', state.query);
  return params;
}

/** Titre au-dessus de la grille : le rayon, la famille, la catégorie ou le créateur regardé. */
export function exploreTitle(state: ExploreState, names: { family: (slug: string) => string; creator: (slug: string) => string }): string {
  if (state.query) return `Résultats pour « ${state.query} »`;
  if (state.creator) return `Donnés par ${names.creator(state.creator)}`;
  if (state.category) return state.category;
  if (state.family) return names.family(state.family);
  return SHELVES.find(item => item.value === state.shelf)?.label ?? SHELVES[0].label;
}

/** Total des votes donnés sur les codes affichés, pour le bandeau « Dis-le en un pouce ». */
export function totalVotes(codes: Pick<Code, 'votes'>[]): number {
  return codes.reduce((sum, code) => sum + Math.max(0, code.votes || 0), 0);
}

/** Message « Copie, essaie, reviens voter » en tête de page : montré tant qu'il n'a pas été fermé. */
export const EXPLORE_INTRO_KEY = 'merkod-explore-intro';

export function readIntroClosed(storage: Pick<Storage, 'getItem'> | undefined): boolean {
  try { return storage?.getItem(EXPLORE_INTRO_KEY) === 'closed'; } catch { return false; }
}

export function closeIntro(storage: Pick<Storage, 'setItem'> | undefined): void {
  try { storage?.setItem(EXPLORE_INTRO_KEY, 'closed'); } catch { /* stockage indisponible : il reviendra à la prochaine visite */ }
}

/** Colonne de gauche : ouverte (large) ou réduite (icônes). Le choix est gardé par navigateur. */
export const EXPLORE_RAIL_KEY = 'merkod-explore-rail';

/** Cartes détaillées (créateur, réussite, votes, date, source) ou simples (outil, créateur, réduction, pouces, talon). */
export type CardView = 'detailed' | 'simple';
export const EXPLORE_CARDS_KEY = 'merkod-explore-cards';

/** Le choix gardé par navigateur ; détaillées par défaut ou si le stockage est indisponible. */
export function readCardView(storage: Pick<Storage, 'getItem'> | undefined): CardView {
  try { return storage?.getItem(EXPLORE_CARDS_KEY) === 'simple' ? 'simple' : 'detailed'; } catch { return 'detailed'; }
}

export function saveCardView(storage: Pick<Storage, 'setItem'> | undefined, view: CardView): void {
  try { storage?.setItem(EXPLORE_CARDS_KEY, view); } catch { /* stockage indisponible : le choix vaut pour cette visite */ }
}
