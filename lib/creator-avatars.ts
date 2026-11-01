import manifest from './creator-avatars.json';
import { creatorSlug } from './ui';

// Photos de profil des créateurs, servies depuis public/avatars/ (générées par `npm run avatars`).
const avatars = manifest as Record<string, { src: string; channelId?: string }>;

/** La photo d'un créateur, ou null s'il faut afficher ses initiales. */
export function creatorAvatar(name: string): string | null {
  const avatar = avatars[creatorSlug(name)];
  return avatar && avatar.src.startsWith('/avatars/') ? avatar.src : null;
}
