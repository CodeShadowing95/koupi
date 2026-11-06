// Contrôles automatiques d'un code promo et score de confiance (voir la spec « vérifications assistées par IA »).
// Tout est calculé par notre code, sans IA : le résultat doit être prévisible, expliqué et testable.
// L'IA ne fait que lire les descriptions : elle peut retirer des points quand elle ne voit pas le code (ADR-0037), jamais en ajouter.

/** Seuil d'abonnés pour qu'un créateur puisse être « Contrôlé par Merkod ». */
export const MIN_SUBSCRIBERS = 1000;
/** Seuil équivalent pour un podcast, qui n'a pas d'abonnés publics : nombre de notes sur sa plateforme (Apple…). */
export const MIN_RATINGS = 50;

/** En dessous de ce score, le rejet est proposé (la décision reste à l'admin). */
export const REJECT_BELOW = 20;
/** Au-delà de ce score, un dossier est assez clair pour se passer d'une deuxième lecture par l'IA. */
export const CLEAR_SCORE = 60;

const BASE_SCORE = 30;
/** Points retirés quand l'IA lit la source et n'y voit pas ce code (lib/verification-run.ts). */
export const AI_MISS_POINTS = -20;

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

/** Le seuil d'audience : au moins MIN_SUBSCRIBERS abonnés, ou MIN_RATINGS notes pour un podcast. */
export function audienceReached(facts: Pick<CreatorFacts, 'subscribers' | 'ratingCount'>): boolean {
  return (facts.subscribers ?? 0) >= MIN_SUBSCRIBERS || (facts.ratingCount ?? 0) >= MIN_RATINGS;
}

/** « Contrôlé par Merkod » : le badge de la plateforme, ou le contrôle de l'admin avec le seuil d'audience. */
export function controlledByMerkod(facts: CreatorFacts): boolean {
  return Boolean(facts.platformVerified) || (Boolean(facts.adminChecked) && audienceReached(facts));
}

// « Créateur vérifié » demande la preuve par la bio ET un compte « Contrôlé par Merkod » (décision du 6 novembre 2026,
// ADR-0020) : la preuve sur un petit compte ne suffit pas.
export function creatorLevelOf(facts: CreatorFacts): CreatorLevel {
  if (!controlledByMerkod(facts)) return 'spotted';
  return facts.claimed ? 'verified' : 'checked';
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
  const excerpt = `${start > 0 ? '…' : ''}${wellFormed(text.slice(start, end)).replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}`;
  return { found: true, excerpt };
}

/** Retire une moitié d'emoji laissée par une coupe au milieu : Postgres refuse ces caractères orphelins. */
export function wellFormed(text: string): string {
  return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
}

/** Les max premiers caractères d'un texte, sans couper un emoji en deux. */
export function clip(text: string, max: number): string {
  return wellFormed(text.slice(0, max));
}

/**
 * Raison pour laquelle un « code » n'en est sûrement pas un, sinon null : un nombre seul (« 2026 », une année)
 * ou une clé de licence (« 3M3K9/5R92S/ZDH5Y/NA944 »), qui n'est pas une réduction et vient souvent d'un site de clés piratées.
 */
export function implausibleCode(code: string): string | null {
  const value = code.trim();
  if (/^\d+$/.test(value)) return 'Le code n’est qu’un nombre (une année ?), pas un code promo.';
  if (/^[A-Z0-9]{4,6}(?:[-/][A-Z0-9]{4,6}){2,}$/i.test(value)) return 'Le code ressemble à une clé de licence, pas à un code promo.';
  return null;
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
  /** Raison donnée par implausibleCode : un nombre seul, une clé de licence. */
  implausible?: string | null;
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
  // Affiché pour que la somme des lignes tombe juste sur le score.
  add(BASE_SCORE, 'Point de départ de tout code.');

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
  if (facts.implausible) add(-50, facts.implausible);

  const up = facts.votesUp ?? 0;
  const down = facts.votesDown ?? 0;
  if (down >= 3 && down > up) add(-20, 'Les visiteurs disent qu’il ne marche plus.');
  else if (up >= 3 && up > down) add(10, 'Les visiteurs disent qu’il marche.');

  const total = reasons.reduce((sum, reason) => sum + reason.points, 0);
  const score = Math.max(0, Math.min(100, total));
  return { score, reasons, suggestion: score < REJECT_BELOW ? 'reject' : 'review' };
}
