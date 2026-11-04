import manifest from './creator-avatars.json';
import { creatorSlug } from './ui';

// Photos de profil des créateurs, servies depuis public/avatars/ (générées par `npm run avatars`).
const avatars = manifest as Record<string, { src: string; channelId?: string }>;

/**
 * La photo d'un créateur, ou null s'il faut afficher ses initiales.
 * stored : les photos gardées en base (ADR-0027), par nom ; elles passent avant celles du dépôt.
 */
export function creatorAvatar(name: string, stored: Record<string, string> = {}): string | null {
  const key = creatorSlug(name);
  if (stored[key]?.startsWith('/media/avatars/')) return stored[key];
  const avatar = avatars[key];
  return avatar && avatar.src.startsWith('/avatars/') ? avatar.src : null;
}
