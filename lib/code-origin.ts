// Origine d'un code : la façon dont Merkod l'a trouvé (ADR-0032). Elle sert à mesurer le rendement de chaque source
// (codes trouvés, validés, copiés). Sans base ni réseau : importable par les composants client.

/** Toutes les origines, y compris celles des sources à venir, pour ne pas changer la contrainte de la base à chaque fois. */
export const CODE_ORIGINS = ['manual', 'submission', 'import', 'youtube_search', 'youtube_channel', 'podcast', 'ai_web', 'spotify', 'creator', 'unknown'] as const;
export type CodeOrigin = (typeof CODE_ORIGINS)[number];

export const CODE_ORIGIN_LABELS: Record<CodeOrigin, string> = {
  manual: 'Saisi à la main',
  submission: 'Proposition d’un visiteur',
  import: 'Import initial',
  youtube_search: 'Recherche YouTube',
  youtube_channel: 'Chaîne YouTube suivie',
  podcast: 'Podcast suivi',
  ai_web: 'Recherche IA sur le web',
  spotify: 'Spotify',
  creator: 'Donné par le créateur',
  unknown: 'Inconnue',
};

export const isCodeOrigin = (value: unknown): value is CodeOrigin => typeof value === 'string' && (CODE_ORIGINS as readonly string[]).includes(value);

/** Origine d'un code venu d'une suggestion d'outil : la suggestion garde sa source (vidéo YouTube ou épisode de podcast). */
export function suggestionOrigin(sourceUrl: string): CodeOrigin {
  try {
    const host = new URL(sourceUrl).hostname.toLowerCase();
    return host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com') ? 'youtube_search' : 'podcast';
  } catch {
    return 'podcast';
  }
}
