// Affichage des comptes créateurs dans l'admin. Sans base ni réseau : importable par les composants client.
import type { CreatorLevel } from './verification';
import type { AccountMetrics } from './account-metrics';

export type CreatorPlatform = 'youtube' | 'tiktok' | 'instagram' | 'snapchat' | 'twitch' | 'x' | 'podcast' | 'other';

export const PLATFORM_LABELS: Record<CreatorPlatform, string> = {
  youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', snapchat: 'Snapchat', twitch: 'Twitch', x: 'X', podcast: 'Podcast', other: 'Autre',
};

export type AdminCreatorAccount = {
  id: string;
  platform: CreatorPlatform;
  externalId: string | null;
  handle: string;
  url: string;
  subscribers: number | null;
  subscribersAt: string | null;
  /** Note, épisodes, vues… lus à la source (lib/account-metrics.ts). */
  metrics: AccountMetrics;
  metricsAt: string | null;
  platformVerified: boolean;
  adminCheckedAt: string | null;
  level: CreatorLevel;
  /** Preuve par la bio : none, pending (code donné), verified (prouvé par le créateur), revoked. */
  claimStatus: ClaimStatus;
  claimCode: string | null;
  claimCodeAt: string | null;
  claimedAt: string | null;
};

export type ClaimStatus = 'none' | 'pending' | 'verified' | 'revoked';

/** Durée de validité d'un code de preuve. */
export const CLAIM_CODE_DAYS = 14;

/** Message prêt à envoyer au créateur pour la preuve par la bio. */
export function claimMessage(code: string, platform: CreatorPlatform, handle: string): string {
  return [
    'Bonjour,',
    '',
    `Pour prouver que le compte ${PLATFORM_LABELS[platform]} ${handle} est bien le tien, ajoute ce code dans sa bio (ou la description de la chaîne) :`,
    '',
    code,
    '',
    `Le code reste valable ${CLAIM_CODE_DAYS} jours. Dis-nous quand c’est fait : ta page Merkod passera « Créateur vérifié », et tu pourras retirer le code ensuite.`,
    '',
    'L’équipe Merkod',
  ].join('\n');
}

/** « 12 400 abonnés », « 1 abonné », ou null si le nombre est inconnu ou masqué. */
export function formatSubscribers(count: number | null): string | null {
  if (count === null) return null;
  return `${new Intl.NumberFormat('fr-FR').format(count).replace(/ /g, ' ')} abonné${count > 1 ? 's' : ''}`;
}

/** Rapport du bouton « Relier les comptes » (voir creator-account-link.ts). */
export type LinkReport = { linked: { creator: string; platform: 'youtube' | 'podcast' }[]; toLink: { creator: string; reason: string }[] };

export const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

/** « 2 chaînes YouTube et 1 podcast reliés. » */
export function linkedSummary(linked: LinkReport['linked']): string {
  if (linked.length === 0) return 'Aucun compte relié.';
  const channels = linked.filter(item => item.platform === 'youtube').length;
  const podcasts = linked.length - channels;
  const parts = [channels ? plural(channels, 'chaîne YouTube', 'chaînes YouTube') : '', podcasts ? plural(podcasts, 'podcast', 'podcasts') : ''].filter(Boolean);
  return `${parts.join(' et ')} relié${linked.length > 1 ? 's' : ''}.`;
}
