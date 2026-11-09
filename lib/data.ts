// Types du catalogue (outils, codes, catégories) et fonctions pures pour les lire.
// Les données viennent de la base (lib/catalog-db.ts), chargées côté serveur par getCatalog() (lib/catalog-server.ts).
import type { CreatorLevel } from './verification';
import type { CodeOrigin } from './code-origin';
import { EXACT, foldText, matchScore } from './fuzzy-search';

/** family : slug de la famille de la catégorie (ADR-0026), null si elle n'est pas rangée. */
export type Category = {
  slug: string; name: string; family: string | null; count: number; tracked: number;
  /** Univers de sa famille (ADR-0046), absent = « Outils en ligne ». */
  universe?: string;
};
export type Tool = {
  slug: string; name: string; category: string; website: string; description: string; priority: number; codes: number;
  /** Slug de la famille de sa catégorie, absent si la catégorie n'est pas rangée. */
  family?: string;
  /** Univers de sa famille (ADR-0046), absent = « Outils en ligne ». */
  universe?: string;
};
/** Famille de catégories (Sécurité, Vidéo…), dans l'ordre du menu. */
export type Family = { slug: string; name: string; universe?: string };
/** Univers du catalogue (ADR-0046) : seuls les univers visibles sont montrés sur le site. */
export type Universe = { slug: string; name: string; visible: boolean };
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
  /** Univers de l'outil (ADR-0046), absent = « Outils en ligne ». */
  universe?: string;
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
  /** Univers et leur visibilité. Absent : tout est « Outils en ligne ». */
  universes?: Universe[];
};

/** Un code est visible sur le site s'il est vérifié ou à tester. En attente et rejeté restent dans l'admin. */
export function isPublic(code: Pick<Code, 'status'>) { return code.status === 'verified' || code.status === 'to_test'; }

/** Taux de réussite en % à partir des votes « ça marche » et « ça ne marche pas ». */
export function successRate(up: number, down: number) { return up + down === 0 ? 0 : Math.round((up / (up + down)) * 100); }

/** Outils trouvés par leur nom puis par leur catégorie, même avec une faute (« canava » trouve Canva). Les noms exacts d'abord. */
export function searchTools(tools: Tool[], query: string) {
  const q = foldText(query);
  if (!q) return tools;
  return ranked(tools, tool => {
    const byName = matchScore(tool.name, q);
    const byCategory = matchScore(tool.category, q);
    // Nom exact > catégorie exacte > nom avec faute > catégorie avec faute.
    if (byName >= EXACT) return byName + 100;
    if (byCategory >= EXACT) return byCategory + 50;
    return Math.max(byName, byCategory - 30);
  });
}

/**
 * Codes publics qui répondent à la recherche, pour les copier tout de suite depuis les résultats.
 * Ordre : nom de l'outil, puis créateur, puis code ou réduction, puis catégorie, d'abord sans faute puis avec ;
 * à égalité, les plus fiables d'abord.
 */
export function searchCodes(codes: Code[], tools: Tool[], query: string): Code[] {
  const q = foldText(query);
  if (!q) return [];
  const categoryOf = new Map(tools.map(tool => [tool.slug, tool.category]));
  const rank = (code: Code) => {
    const fields = [[code.tool], [code.creator], [code.code, code.discount], [categoryOf.get(code.toolSlug) ?? '']];
    const scores = fields.map(texts => Math.max(...texts.map(text => matchScore(text, q))));
    const exact = scores.findIndex(score => score >= EXACT);
    if (exact >= 0) return exact;
    const typo = scores.findIndex(score => score > 0);
    return typo >= 0 ? fields.length + typo : -1;
  };
  return codes
    .filter(isPublic)
    .map(code => ({ code, rank: rank(code) }))
    .filter(item => item.rank >= 0)
    .sort((a, b) => a.rank - b.rank || b.code.success - a.code.success || b.code.votes - a.code.votes)
    .map(item => item.code);
}

/** Créateurs trouvés par leur nom, même avec une faute ; les noms exacts d'abord. Vide si la recherche est vide. */
export function searchCreators<T extends { name: string }>(creators: T[], query: string): T[] {
  const q = foldText(query);
  return q ? ranked(creators, creator => matchScore(creator.name, q)) : [];
}

/** Garde les éléments notés au-dessus de 0, du mieux noté au moins bien, dans leur ordre d'origine à égalité. */
function ranked<T>(items: T[], score: (item: T) => number) {
  return items.map((item, index) => ({ item, index, score: score(item) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(entry => entry.item);
}
