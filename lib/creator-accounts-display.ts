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
};

/** « 12 400 abonnés », « 1 abonné », ou null si le nombre est inconnu ou masqué. */
export function formatSubscribers(count: number | null): string | null {
  if (count === null) return null;
  return `${new Intl.NumberFormat('fr-FR').format(count).replace(/ /g, ' ')} abonné${count > 1 ? 's' : ''}`;
}
