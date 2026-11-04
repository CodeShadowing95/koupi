// D'où vient un code : la plateforme de sa source (vidéo YouTube, post Instagram, épisode de podcast…),
// déduite de l'adresse de la source. Sert au logo affiché sur le coupon, sans rien stocker en base.
import type { CreatorPlatform } from './creator-accounts-display';

const HOSTS: [RegExp, CreatorPlatform][] = [
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)twitch\.tv$/, 'twitch'],
  [/(^|\.)(x\.com|twitter\.com)$/, 'x'],
  [/(^|\.)snapchat\.com$/, 'snapchat'],
  [/(^|\.)(podcasts\.apple\.com|anchor\.fm|ausha\.co|acast\.com|podbean\.com|spreaker\.com|buzzsprout\.com|podcast\.ausha\.co)$/, 'podcast'],
];

/** Plateforme de la source, « other » pour un site quelconque, null sans adresse valide. */
export function sourcePlatform(source: string | null | undefined): CreatorPlatform | null {
  if (!source) return null;
  let url: URL;
  try { url = new URL(source); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  for (const [pattern, platform] of HOSTS) if (pattern.test(host)) return platform;
  // Spotify et Deezer hébergent aussi de la musique : seuls les émissions et épisodes sont des podcasts.
  if (/(^|\.)(open\.spotify\.com|deezer\.com)$/.test(host) && /\/(show|episode)\//.test(url.pathname)) return 'podcast';
  if (/\.(rss|xml)$/.test(url.pathname) || /\/(feed|rss)\/?$/.test(url.pathname)) return 'podcast';
  return 'other';
}
