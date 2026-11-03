// Affichage des comptes créateurs dans l'admin. Sans base ni réseau : importable par les composants client.
import type { CreatorLevel } from './verification';

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
    `Le code reste valable ${CLAIM_CODE_DAYS} jours. Dis-nous quand c’est fait : ta page Koupi passera « Créateur vérifié », et tu pourras retirer le code ensuite.`,
    '',
    'L’équipe Koupi',
  ].join('\n');
}

/** « 12 400 abonnés », « 1 abonné », ou null si le nombre est inconnu ou masqué. */
export function formatSubscribers(count: number | null): string | null {
  if (count === null) return null;
  return `${new Intl.NumberFormat('fr-FR').format(count).replace(/ /g, ' ')} abonné${count > 1 ? 's' : ''}`;
}
