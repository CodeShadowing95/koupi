// En-tête de cache des images gardées en base (/media/avatars, /media/logos, ADR-0027).
// s-maxage demande au CDN de Vercel de garder une copie : les visiteurs suivants reçoivent l'image
// sans relancer la fonction ni relire Neon. Vercel retire s-maxage avant d'envoyer la réponse au navigateur.

/** Adresse versionnée (?v=<date>) : elle change à chaque actualisation, donc l'image peut être gardée un an. */
export const VERSIONED_MEDIA_CACHE = 'public, max-age=31536000, s-maxage=31536000, immutable';

/** Adresse sans version (ancien lien) : l'image peut changer sous la même adresse, on la garde une heure. */
export const UNVERSIONED_MEDIA_CACHE = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';

export function mediaCacheControl(url: string): string {
  return new URL(url, 'http://localhost').searchParams.get('v') ? VERSIONED_MEDIA_CACHE : UNVERSIONED_MEDIA_CACHE;
}
