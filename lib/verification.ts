// Contrôles automatiques d'un code promo et score de confiance (voir la spec « vérifications assistées par IA »).
// Tout est calculé par notre code, sans IA : le résultat doit être prévisible, expliqué et testable.
// L'IA, quand elle sera branchée, ne fera que lire les descriptions ; elle ne décide jamais du score.

/** Seuil d'abonnés pour qu'un créateur puisse être « Contrôlé par Merkod ». */
export const MIN_SUBSCRIBERS = 1000;
/** Seuil équivalent pour un podcast, qui n'a pas d'abonnés publics : nombre de notes sur sa plateforme (Apple…). */
export const MIN_RATINGS = 50;

/** En dessous de ce score, le rejet est proposé (la décision reste à l'admin). */
export const REJECT_BELOW = 20;
/** Au-delà de ce score, un dossier est assez clair pour se passer d'une deuxième lecture par l'IA. */
export const CLEAR_SCORE = 60;

const BASE_SCORE = 30;

export type CreatorLevel = 'spotted' | 'checked' | 'verified';

export const CREATOR_LEVEL_LABELS: Record<CreatorLevel, string> = {
  spotted: 'Repéré',
  checked: 'Contrôlé par Merkod',
  verified: 'Créateur vérifié',
};

export type CreatorFacts = {
  /** Le créateur a réclamé sa page et prouvé que le compte est à lui. */
  claimed?: boolean;
  /** Badge de chaîne certifiée YouTube, coché à la main par l'admin (l'API ne le donne pas). */
  platformVerified?: boolean;
  /** L'admin a contrôlé le compte (réel, actif, pas d'usurpation). */
  adminChecked?: boolean;
  subscribers?: number | null;
  /** Nombre de notes (podcasts) : remplace le seuil d'abonnés quand ceux-ci ne sont pas publics. */
  ratingCount?: number | null;
};

// Le badge de la plateforme suffit pour « Contrôlé par Merkod » ; sinon il faut le contrôle de l'admin et un seuil
// d'audience : au moins MIN_SUBSCRIBERS abonnés, ou MIN_RATINGS notes pour un podcast.
export function creatorLevelOf(facts: CreatorFacts): CreatorLevel {
  if (facts.claimed) return 'verified';
  if (facts.platformVerified) return 'checked';
  if (facts.adminChecked && ((facts.subscribers ?? 0) >= MIN_SUBSCRIBERS || (facts.ratingCount ?? 0) >= MIN_RATINGS)) return 'checked';
  return 'spotted';
}

export type SourceKind = 'youtube' | 'podcast' | 'instagram' | 'tiktok' | 'other';

export function sourceKindOf(url: string): SourceKind {
  let host: string;
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\.|^m\./, ''); } catch { return 'other'; }
  if (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com')) return 'youtube';
  if (host === 'instagram.com') return 'instagram';
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok';
  if (['podcasts.apple.com', 'open.spotify.com', 'podcastindex.org', 'listennotes.com', 'ausha.co', 'podcast.ausha.co', 'anchor.fm', 'feeds.acast.com', 'shows.acast.com']
    .some(domain => host === domain || host.endsWith(`.${domain}`))) return 'podcast';
  return 'other';
}

export type CodeMatch = { found: boolean; excerpt: string | null };

const EXCERPT_RADIUS = 80;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Cherche le code tel quel dans le texte de la source, sans tenir compte de la casse,
// et seulement en mot entier (« MERKOD10 » ne compte pas dans « MERKOD100 »). Renvoie l'extrait qui sert de preuve.
export function findCodeInText(code: string, text: string): CodeMatch {
  const needle = code.trim();
  if (!needle || !text) return { found: false, excerpt: null };
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(needle)}(?![\\p{L}\\p{N}])`, 'iu');
  const match = pattern.exec(text);
  if (!match) return { found: false, excerpt: null };
  const start = Math.max(0, match.index - EXCERPT_RADIUS);
  const end = Math.min(text.length, match.index + match[0].length + EXCERPT_RADIUS);
  const excerpt = `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}`;
  return { found: true, excerpt };
}

const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'cutt.ly', 'rebrand.ly', 'shorturl.at', 'ow.ly'];

export type SpamInput = { sourceUrl: string; comment?: string | null; code: string };

// Signes simples de spam dans une proposition. Chaque signe est une phrase lisible par l'admin.
export function spamSignals(input: SpamInput): string[] {
  const signals: string[] = [];
  try {
    const host = new URL(input.sourceUrl).hostname.toLowerCase().replace(/^www\./, '');
    if (SHORTENERS.includes(host)) signals.push('La source est un lien raccourci.');
  } catch {
    signals.push('Le lien de la source est invalide.');
  }
  const links = input.comment?.match(/https?:\/\//gi)?.length ?? 0;
  if (links >= 2) signals.push('Le commentaire contient plusieurs liens.');
  if (/\s/.test(input.code.trim())) signals.push('Le code contient des espaces.');
  return signals;
}

export type VerificationFacts = {
  /** null : la source n'a pas encore été ouverte. */
  sourceOnline: boolean | null;
  /** null : le texte de la source n'a pas encore été lu. */
  codeInSource: boolean | null;
  /** null : créateur inconnu de Merkod. */
  creatorLevel: CreatorLevel | null;
  toolKnown: boolean;
  duplicate: boolean;
  spam: string[];
  votesUp?: number;
  votesDown?: number;
};

export type ScoreReason = { points: number; label: string };

export type VerificationScore = {
  score: number;
  reasons: ScoreReason[];
  suggestion: 'reject' | 'review';
};

// Somme de points expliquée, bornée entre 0 et 100. Chaque raison est affichée telle quelle dans l'admin.
export function scoreVerification(facts: VerificationFacts): VerificationScore {
  const reasons: ScoreReason[] = [];
  const add = (points: number, label: string) => reasons.push({ points, label });

  if (facts.codeInSource === true) add(40, 'Le code figure mot pour mot dans la source.');
  else if (facts.codeInSource === false) add(-40, 'Le code est introuvable dans la source.');
  else add(0, 'Le texte de la source n’a pas encore été lu.');

  if (facts.sourceOnline === true) add(10, 'La source est en ligne.');
  else if (facts.sourceOnline === false) add(-50, 'La source a disparu.');

  if (facts.creatorLevel === 'verified') add(20, 'Créateur vérifié.');
  else if (facts.creatorLevel === 'checked') add(15, 'Créateur contrôlé par Merkod.');
  else if (facts.creatorLevel === 'spotted') add(0, 'Créateur repéré, pas encore contrôlé.');
  else add(-10, 'Créateur inconnu de Merkod.');

  if (facts.toolKnown) add(10, 'L’outil est dans le catalogue.');
  else add(-5, 'L’outil n’est pas dans le catalogue.');

  if (facts.duplicate) add(-30, 'Un code identique existe déjà.');
  for (const signal of facts.spam) add(-20, signal);

  const up = facts.votesUp ?? 0;
  const down = facts.votesDown ?? 0;
  if (down >= 3 && down > up) add(-20, 'Les visiteurs disent qu’il ne marche plus.');
  else if (up >= 3 && up > down) add(10, 'Les visiteurs disent qu’il marche.');

  const total = reasons.reduce((sum, reason) => sum + reason.points, BASE_SCORE);
  const score = Math.max(0, Math.min(100, total));
  return { score, reasons, suggestion: score < REJECT_BELOW ? 'reject' : 'review' };
}
