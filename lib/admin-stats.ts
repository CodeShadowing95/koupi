// Indicateurs du back-office calculés à partir du catalogue lu en base (lib/catalog-db.ts).
// Fonctions pures : l'accueil, la page Statistiques et les tests les partagent.
import type { Category, Code, CodeStatus, Tool } from './data';

export type CatalogInput = { codes: Code[]; tools: Tool[]; categories: Category[]; tracked: number };

export const STATUS_ORDER: CodeStatus[] = ['pending', 'to_test', 'verified', 'rejected'];

/** Seuil sous lequel un code voté est signalé : moins de 50 % de réussite avec au moins 2 votes. */
export const FLAG_MIN_VOTES = 2;
export const FLAG_MAX_SUCCESS = 50;

/** Objectifs affichés à côté des indicateurs (en %). */
/** Un code vérifié est à retester après ce délai : les offres changent, les codes expirent. */
export const RETEST_DAYS = 30;

/** Codes vérifiés jamais testés depuis l'import, ou testés il y a plus de RETEST_DAYS jours. Les plus anciens d'abord. */
export function staleCodes(codes: Code[], now = new Date()): Code[] {
  const limit = now.getTime() - RETEST_DAYS * 86_400_000;
  return codes
    .filter(code => !code.archived && code.status === 'verified' && (!code.lastTestedAt || new Date(code.lastTestedAt).getTime() < limit))
    .sort((a, b) => (a.lastTestedAt ?? '').localeCompare(b.lastTestedAt ?? ''));
}

export const TARGETS = { coverage: 50, verified: 60, success: 80, delayHours: 48 } as const;

export function isVisible(code: Pick<Code, 'status'>): boolean {
  return code.status === 'verified' || code.status === 'to_test';
}

function percent(part: number, total: number): number | null {
  return total === 0 ? null : Math.round((part / total) * 100);
}

export function statusCounts(codes: Code[]): Record<CodeStatus, number> {
  const counts: Record<CodeStatus, number> = { pending: 0, to_test: 0, verified: 0, rejected: 0 };
  for (const code of codes) counts[code.status] += 1;
  return counts;
}

/** Réussite moyenne pondérée par le nombre de votes, sur les codes qui en ont. */
export function weightedSuccess(codes: Code[]): { rate: number | null; votes: number; votedCodes: number } {
  const voted = codes.filter(code => code.votes > 0);
  const votes = voted.reduce((sum, code) => sum + code.votes, 0);
  const weighted = voted.reduce((sum, code) => sum + code.votes * code.success, 0);
  return { rate: votes === 0 ? null : Math.round(weighted / votes), votes, votedCodes: voted.length };
}

/** Codes visibles que les visiteurs signalent comme ne marchant pas. */
export function flaggedCodes(codes: Code[]): Code[] {
  return codes
    .filter(code => isVisible(code) && code.votes >= FLAG_MIN_VOTES && code.success < FLAG_MAX_SUCCESS)
    .sort((a, b) => a.success - b.success || b.votes - a.votes);
}

export function overview(catalog: CatalogInput) {
  const counts = statusCounts(catalog.codes);
  const visible = catalog.codes.filter(isVisible);
  const coveredTools = new Set(visible.map(code => code.tool.toLowerCase())).size;
  const success = weightedSuccess(catalog.codes);
  return {
    total: catalog.codes.length,
    counts,
    visible: visible.length,
    coveredTools,
    tracked: catalog.tracked,
    coverage: percent(coveredTools, catalog.tracked),
    verifiedRate: percent(counts.verified, visible.length),
    creators: new Set(visible.map(code => code.creator)).size,
    success,
    flagged: flaggedCodes(catalog.codes),
    emptyCategories: catalog.categories.filter(category => category.count === 0),
  };
}

/** Couverture par catégorie, de la mieux couverte à la moins couverte. */
export function coverageByCategory(categories: Category[]) {
  return categories
    .map(category => ({ name: category.name, slug: category.slug, covered: category.count, tracked: category.tracked, rate: percent(category.count, category.tracked) ?? 0 }))
    .sort((a, b) => b.rate - a.rate || b.tracked - a.tracked || a.name.localeCompare(b.name, 'fr'));
}

/** Outils qui ont le plus de codes visibles. */
export function topTools(codes: Code[], limit = 8): { tool: string; count: number }[] {
  const byTool = new Map<string, number>();
  for (const code of codes.filter(isVisible)) byTool.set(code.tool, (byTool.get(code.tool) ?? 0) + 1);
  return [...byTool].map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count || a.tool.localeCompare(b.tool, 'fr'))
    .slice(0, limit);
}

/** Répartition des codes votés par taux de réussite : à retester, à surveiller, fiables. */
export function reliabilityBuckets(codes: Code[]): { low: number; mid: number; high: number } {
  const voted = codes.filter(code => code.votes > 0);
  return {
    low: voted.filter(code => code.success < 50).length,
    mid: voted.filter(code => code.success >= 50 && code.success < 80).length,
    high: voted.filter(code => code.success >= 80).length,
  };
}

export type Todo = { id: string; tone: 'warn' | 'bad' | 'info'; title: string; why: string; cta: string; href: string };

/** Les actions du jour, de la plus utile à la moins utile. */
export function todos(catalog: CatalogInput, pendingSubmissions: number | null, now = new Date()): Todo[] {
  const stats = overview(catalog);
  const list: Todo[] = [];
  if (pendingSubmissions) list.push({
    id: 'submissions', tone: 'bad',
    title: `Répondre à ${pendingSubmissions} proposition${pendingSubmissions > 1 ? 's' : ''} de visiteurs`,
    why: 'Quelqu’un a pris le temps de partager un code. Une réponse rapide donne envie de recommencer.',
    cta: 'Ouvrir la file', href: '/admin/propositions',
  });
  for (const code of stats.flagged.slice(0, 2)) list.push({
    id: `flag-${code.id}`, tone: 'bad',
    title: `Revoir ${code.code} (${code.tool}) : ${code.votes} votes, ${code.success} % de réussite`,
    why: 'Les visiteurs signalent qu’il ne marche pas. Teste-le : s’il est mort, passe-le en Rejeté.',
    cta: 'Voir le code', href: `/admin/codes?q=${encodeURIComponent(code.code)}`,
  });
  const stale = staleCodes(catalog.codes, now);
  if (stale.length) list.push({
    id: 'retest', tone: 'warn',
    title: `Retester ${stale.length} code${stale.length > 1 ? 's' : ''} vérifié${stale.length > 1 ? 's' : ''} : test de plus de ${RETEST_DAYS} jours ou jamais daté`,
    why: 'Une offre peut changer ou expirer. Un « Vérifié » trop ancien promet quelque chose qu’on ne sait plus.',
    cta: 'Voir les codes à retester', href: '/admin/codes?status=retest',
  });
  if (stats.counts.to_test) list.push({
    id: 'to-test', tone: 'warn',
    title: `Tester ${stats.counts.to_test} code${stats.counts.to_test > 1 ? 's' : ''} visible${stats.counts.to_test > 1 ? 's' : ''} mais jamais vérifié${stats.counts.to_test > 1 ? 's' : ''}`,
    why: 'Ils sont déjà sur le site. Un code qui échoue fait partir le visiteur : c’est la première cause de perte de confiance.',
    cta: 'Commencer les tests', href: '/admin/codes?status=to_test',
  });
  if (stats.counts.pending) list.push({
    id: 'pending', tone: 'info',
    title: `Trancher ${stats.counts.pending} code${stats.counts.pending > 1 ? 's' : ''} en attente`,
    why: 'Trouvés par le script, pas encore publiés. Chaque code publié peut couvrir un nouvel outil.',
    cta: 'Trier la file', href: '/admin/codes?status=pending',
  });
  if (stats.emptyCategories.length) list.push({
    id: 'empty-categories', tone: 'info',
    title: `Trouver des codes pour ${stats.emptyCategories.length} catégorie${stats.emptyCategories.length > 1 ? 's' : ''} vide${stats.emptyCategories.length > 1 ? 's' : ''}`,
    why: `${stats.emptyCategories.map(category => category.name).join(', ')} : aucun outil n’y a encore de code visible.`,
    cta: 'Voir les statistiques', href: '/admin/stats',
  });
  return list;
}
