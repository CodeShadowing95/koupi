// Regroupement des origines en sources et phrase « Ce que ça t'apprend » : sans base, utilisable côté navigateur.
import type { CodeOrigin } from './code-origin';

export const STATS_DAYS = 30;

/** Les origines regroupées comme sur la page Sources : l'import et l'inconnu vont avec la saisie à la main. */
export const SOURCE_GROUPS = [
  { key: 'youtube_search', label: 'Recherche YouTube', origins: ['youtube_search'] },
  { key: 'youtube_channel', label: 'Chaînes suivies', origins: ['youtube_channel'] },
  { key: 'podcast', label: 'Podcasts suivis', origins: ['podcast'] },
  { key: 'submission', label: 'Propositions', origins: ['submission'] },
  { key: 'manual', label: 'À la main et import', origins: ['manual', 'import', 'unknown'] },
  { key: 'ai_web', label: 'IA sur le web', origins: ['ai_web'] },
  { key: 'spotify', label: 'Spotify', origins: ['spotify'] },
] as const satisfies readonly { key: string; label: string; origins: readonly CodeOrigin[] }[];

export type SourceYield = { key: string; label: string; found: number; published: number; copies: number };
export type CopiesRow = { name: string; slug: string; copies: number };

export type SourceStats = { since: string; sources: SourceYield[]; tools: CopiesRow[]; categories: CopiesRow[]; totalCopies: number };

/** Regroupe les chiffres par origine en sources. Les sources à venir sans aucun chiffre sont laissées de côté. */
export function groupBySource(rows: { origin: CodeOrigin; found: number; published: number; copies: number }[]): SourceYield[] {
  return SOURCE_GROUPS.map(group => {
    const mine = rows.filter(row => (group.origins as readonly string[]).includes(row.origin));
    return {
      key: group.key, label: group.label,
      found: mine.reduce((sum, row) => sum + row.found, 0),
      published: mine.reduce((sum, row) => sum + row.published, 0),
      copies: mine.reduce((sum, row) => sum + row.copies, 0),
    };
  }).filter(item => item.found + item.published + item.copies > 0 || !['ai_web', 'spotify'].includes(item.key));
}


const plural = (n: number, word: string) => `${n.toLocaleString('fr-FR')} ${word}${n > 1 ? 's' : ''}`;

/**
 * La phrase « Ce que ça t'apprend » du rendement : la source qui fait le plus copier,
 * et celle qui trouve beaucoup mais publie peu (au moins 5 codes trouvés, moins d'un tiers publiés).
 */
export function sourceLesson(sources: SourceYield[]): string {
  const best = [...sources].filter(item => item.copies > 0).sort((a, b) => b.copies - a.copies)[0];
  const noisy = [...sources].filter(item => item.found >= 5 && item.published / item.found < 1 / 3).sort((a, b) => b.found - a.found)[0];
  if (!best && !noisy) return 'Pas encore assez de chiffres sur 30 jours. Reviens après quelques passages des sources et quelques copies des visiteurs.';
  const parts: string[] = [];
  if (best) parts.push(`« ${best.label} » fait le plus copier (${plural(best.copies, 'copie')}) : c’est la source à garder en marche en priorité.`);
  if (noisy) parts.push(`« ${noisy.label} » trouve beaucoup (${plural(noisy.found, 'code')}) mais tu n’en publies que ${noisy.published} : resserre ses réglages pour moins de tri.`);
  return parts.join(' ');
}
