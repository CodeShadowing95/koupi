// Affichage de la page Vérifications, sans dépendance serveur : utilisable dans les composants client.
import type { VerificationReason } from '@/db/schema';
import type { CodeOrigin } from './code-origin';
import { CLEAR_SCORE, REJECT_BELOW } from './verification';
import { slugify } from './slug';

export type QueueCheck = {
  score: number;
  reasons: VerificationReason[];
  evidence: string | null;
  model: string | null;
  costUsdMicros: number;
  createdAt: string;
  /** Codes que l'IA a lus dans la source, autres que le code actuel : l'admin peut en reprendre un d'un clic. */
  aiCodes: string[];
  /** Marque à laquelle l'IA rattache ce code quand ce n'est pas l'outil du code, sinon null. */
  aiTool: string | null;
};

export type QueueItem = {
  id: string;
  /** '' pour une offre sans code, donnée par son lien (offerLink). */
  code: string;
  /** Lien de l'offre (affiliation) du créateur, null s'il n'y en a pas. */
  offerLink: string | null;
  discount: string;
  /** verified : un retest dont l'analyse n'est plus claire (onglet « Retests »). */
  status: 'pending' | 'to_test' | 'verified';
  tool: string;
  toolSlug: string;
  creator: string;
  sourceUrl: string;
  sourceTitle: string;
  /** Comment Merkod a trouvé le code (lib/code-origin.ts). */
  origin: CodeOrigin;
  votesUp: number;
  votesDown: number;
  createdAt: string;
  /** Date de fin AAAA-MM-JJ, null s'il n'y en a pas. */
  expiresOn: string | null;
  /** Date de fin passée depuis le dernier test. */
  expired: boolean;
  check: QueueCheck | null;
  /** Univers de la famille de l'outil (ADR-0046), « outils-en-ligne » sans famille. */
  universe: string;
};

export type QueueUniverse = { slug: string; name: string; visible: boolean; count: number };

/** Univers qui ont des dossiers dans la file, dans l'ordre des univers, avec leur nombre de dossiers. */
export function queueUniverses(queue: Pick<QueueItem, 'universe'>[], universes: Omit<QueueUniverse, 'count'>[]): QueueUniverse[] {
  const counts = new Map<string, number>();
  for (const item of queue) counts.set(item.universe, (counts.get(item.universe) ?? 0) + 1);
  const known = universes.filter(universe => counts.has(universe.slug)).map(universe => ({ ...universe, count: counts.get(universe.slug)! }));
  const unknown = [...counts].filter(([slug]) => !universes.some(universe => universe.slug === slug)).map(([slug, count]) => ({ slug, name: slug, visible: false, count }));
  return [...known, ...unknown];
}

export type Verdict = 'reject' | 'doubt' | 'clear' | 'none';

/** Lecture du score pour l'admin : rejet proposé, dossier douteux, dossier clair, ou pas encore analysé. */
export function verdictOf(check: Pick<QueueCheck, 'score'> | null): Verdict {
  if (!check) return 'none';
  if (check.score < REJECT_BELOW) return 'reject';
  return check.score < CLEAR_SCORE ? 'doubt' : 'clear';
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  reject: 'Rejet proposé',
  doubt: 'À regarder de près',
  clear: 'Dossier clair',
  none: 'Pas encore analysé',
};

/** Nom court d'un modèle pour l'admin : « claude-haiku-5-5 » devient « Haiku 5.5 ». */
export function modelLabel(model: string | null): string {
  if (!model) return 'aucun';
  const match = model.match(/^claude-([a-z]+)-(\d+)(?:-(\d+))?/);
  if (!match) return model;
  const [, family, major, minor] = match;
  return `${family[0].toUpperCase()}${family.slice(1)} ${minor ? `${major}.${minor}` : major}`;
}

/** Coût en dollars, lisible : « 0,0082 $ » pour un appel, « 1,20 $ » pour un mois. */
export function formatUsd(micros: number): string {
  const dollars = micros / 1_000_000;
  const digits = dollars > 0 && dollars < 0.01 ? 4 : 2;
  return `${dollars.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} $`;
}

/** Dépense facturée en dollars, affichée en euros comme le plafond : « 8,33 € ». */
export function formatEur(usdMicros: number, usdPerEur: number): string {
  const euros = usdMicros / 1_000_000 / (usdPerEur > 0 ? usdPerEur : 1);
  const digits = euros > 0 && euros < 0.01 ? 4 : 2;
  return `${euros.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} €`;
}

/** Découpe un extrait pour surligner le code : les morceaux où match vaut true sont le code. */
export function highlightCode(excerpt: string, code: string): { text: string; match: boolean }[] {
  if (!code) return [{ text: excerpt, match: false }];
  const parts: { text: string; match: boolean }[] = [];
  const lower = excerpt.toLowerCase();
  const needle = code.toLowerCase();
  let from = 0;
  for (let at = lower.indexOf(needle); at >= 0; at = lower.indexOf(needle, at + needle.length)) {
    if (at > from) parts.push({ text: excerpt.slice(from, at), match: false });
    parts.push({ text: excerpt.slice(at, at + needle.length), match: true });
    from = at + needle.length;
  }
  if (from < excerpt.length) parts.push({ text: excerpt.slice(from), match: false });
  return parts;
}

export type PickerTool = { slug: string; name: string };

/** Outil du catalogue qui porte le nom lu par l'IA (« Rankerfox », « NordVPN Plus » → NordVPN), autre que l'outil actuel, sinon ''. */
export function catalogMatch(tools: PickerTool[], aiTool: string, exceptSlug: string): string {
  const key = slugify(aiTool);
  if (!key) return '';
  const candidates = tools.filter(tool => tool.slug !== exceptSlug);
  const exact = candidates.find(tool => slugify(tool.name) === key);
  if (exact) return exact.slug;
  const close = candidates
    .filter(tool => { const name = slugify(tool.name); return name.length >= 3 && (key.includes(name) || name.includes(key)); })
    .sort((a, b) => b.name.length - a.name.length);
  return close[0]?.slug ?? '';
}
