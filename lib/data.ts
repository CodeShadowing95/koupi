// Types du catalogue (outils, codes, catégories) et fonctions pures pour les lire.
// Les données viennent de la base (lib/catalog-db.ts), chargées côté serveur par getCatalog() (lib/catalog-server.ts).
import type { CreatorLevel } from './verification';
import type { CodeOrigin } from './code-origin';

/** family : slug de la famille de la catégorie (ADR-0026), null si elle n'est pas rangée. */
export type Category = { slug: string; name: string; family: string | null; count: number; tracked: number };
export type Tool = {
  slug: string; name: string; category: string; website: string; description: string; priority: number; codes: number;
  /** Slug de la famille de sa catégorie, absent si la catégorie n'est pas rangée. */
  family?: string;
};
/** Famille de catégories (Sécurité, Vidéo…), dans l'ordre du menu. */
export type Family = { slug: string; name: string };
export type CodeStatus = 'verified' | 'to_test' | 'pending' | 'rejected';
export type Code = {
  id: string; tool: string; toolSlug: string; creator: string; creatorSlug: string; code: string; discount: string; status: CodeStatus;
  source: string; sourceTitle: string; creatorLink?: string; votes: number; success: number; note?: string;
  /** Date ISO du dernier test par l'admin, null s'il n'a jamais été testé. */
  lastTestedAt: string | null;
  /** Date ISO du dernier test au paiement (la réduction s'applique), null sinon. */
  paymentTestedAt: string | null;
  /** Date de fin AAAA-MM-JJ écrite par le créateur, null s'il n'y en a pas. */
  expiresOn: string | null;
  createdAt: string;
  /** Niveau du créateur, absent tant qu'il est seulement « repéré ». */
  creatorLevel?: Exclude<CreatorLevel, 'spotted'>;
  /** Seulement dans l'admin : code retiré du site et des statistiques. */
  archived?: boolean;
  /** Seulement dans l'admin : comment Merkod a trouvé le code (lib/code-origin.ts). */
  origin?: CodeOrigin;
  /** Nom du podcast suivi d'où vient l'épisode source (« Entendu dans GDIY, épisode #574 »). */
  podcast?: string;
};
export type Catalog = {
  categories: Category[];
  families: Family[];
  /** Outils publiés : au moins un code visible sur le site. */
  tools: Tool[];
  /** Tous les codes non archivés, quel que soit leur statut. */
  codes: Code[];
  /** Nombre d'outils suivis, même sans code publié. */
  tracked: number;
};

/** Un code est visible sur le site s'il est vérifié ou à tester. En attente et rejeté restent dans l'admin. */
export function isPublic(code: Pick<Code, 'status'>) { return code.status === 'verified' || code.status === 'to_test'; }

/** Taux de réussite en % à partir des votes « ça marche » et « ça ne marche pas ». */
export function successRate(up: number, down: number) { return up + down === 0 ? 0 : Math.round((up / (up + down)) * 100); }

function normalize(value: string) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s/g, ''); }

/** Outils dont le nom ou la catégorie contient la recherche (« vpn » trouve aussi Surfshark). Les noms qui correspondent passent d'abord. */
export function searchTools(tools: Tool[], query: string) {
  const q = normalize(query);
  const byName = tools.filter(tool => normalize(tool.name).includes(q));
  const byCategory = tools.filter(tool => !byName.includes(tool) && normalize(tool.category).includes(q));
  return [...byName, ...byCategory];
}

/**
 * Codes publics qui répondent à la recherche, pour les copier tout de suite depuis les résultats.
 * Ordre : nom de l'outil, puis créateur, puis code ou réduction, puis catégorie ; à égalité, les plus fiables d'abord.
 */
export function searchCodes(codes: Code[], tools: Tool[], query: string): Code[] {
  const q = normalize(query);
  if (!q) return [];
  const categoryOf = new Map(tools.map(tool => [tool.slug, tool.category]));
  const rank = (code: Code) => {
    if (normalize(code.tool).includes(q)) return 0;
    if (normalize(code.creator).includes(q)) return 1;
    if (normalize(code.code).includes(q) || normalize(code.discount).includes(q)) return 2;
    if (normalize(categoryOf.get(code.toolSlug) ?? '').includes(q)) return 3;
    return -1;
  };
  return codes
    .filter(isPublic)
    .map(code => ({ code, rank: rank(code) }))
    .filter(item => item.rank >= 0)
    .sort((a, b) => a.rank - b.rank || b.code.success - a.code.success || b.code.votes - a.code.votes)
    .map(item => item.code);
}

/** Créateurs dont le nom contient la recherche (sans accents ni espaces). Vide si la recherche est vide. */
export function searchCreators<T extends { name: string }>(creators: T[], query: string): T[] {
  const q = normalize(query);
  return q ? creators.filter(creator => normalize(creator.name).includes(q)) : [];
}
