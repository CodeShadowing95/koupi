// Affichage de la page Vérifications, sans dépendance serveur : utilisable dans les composants client.
import type { VerificationReason } from '@/db/schema';
import type { CodeOrigin } from './code-origin';
import { CLEAR_SCORE, REJECT_BELOW } from './verification';

export type QueueCheck = {
  score: number;
  reasons: VerificationReason[];
  evidence: string | null;
  model: string | null;
  costUsdMicros: number;
  createdAt: string;
};

export type QueueItem = {
  id: string;
  code: string;
  discount: string;
  /** verified : un retest dont l'analyse n'est plus claire (onglet « Retests »). */
  status: 'pending' | 'to_test' | 'verified';
  tool: string;
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
};

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
