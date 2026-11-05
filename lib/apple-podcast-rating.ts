// Note d'un podcast sur Apple Podcasts. L'API iTunes ne la donne pas : on la lit sur la page publique du podcast
// (podcasts.apple.com), dans la zone « Notes et avis ». Si Apple change sa page, la lecture rend null et rien n'est effacé.

export type PodcastRating = { rating: number; ratingCount: number | null };

const PAGE = 'https://podcasts.apple.com/fr/podcast/id';
const MAX_BYTES = 3_000_000;

const decode = (text: string) => text.replace(/&nbsp;|&#160;| | /g, ' ').replace(/&amp;/g, '&');

/** « 4,7 » → 4.7 ; null hors de 0 à 5. */
function parseRating(text: string): number | null {
  const value = Number(decode(text).trim().replace(',', '.'));
  return Number.isFinite(value) && value >= 0 && value <= 5 ? value : null;
}

/** « 5 281 notes », « 1.234 ratings » → 5281 ; « 5,3 k notes » → 5300. */
export function parseRatingCount(text: string): number | null {
  const match = decode(text).match(/(\d[\d ., ]*)\s*(k|M)?\s*(?:notes?|ratings?|avis)/i);
  if (!match) return null;
  const digits = match[1].trim();
  if (match[2]) {
    const value = Number(digits.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(value) ? Math.round(value * (match[2].toLowerCase() === 'k' ? 1_000 : 1_000_000)) : null;
  }
  const value = Number(digits.replace(/[\s.,]/g, ''));
  return Number.isSafeInteger(value) ? value : null;
}

/** Lit la note dans le HTML d'une page Apple Podcasts. null si la page n'en montre pas. */
export function parseApplePodcastRating(html: string): PodcastRating | null {
  const average = html.match(/data-testid="amp-rating__average-rating"[^>]*>([^<]{1,8})</);
  const count = html.match(/data-testid="amp-rating__rating-count-text"[^>]*>([^<]{1,40})</);
  if (average) {
    const rating = parseRating(average[1]);
    if (rating !== null) return { rating, ratingCount: count ? parseRatingCount(count[1]) : null };
  }
  // Résumé sous le titre : aria-label="4,7 sur 5, 5,3 k notes" (nombre arrondi).
  const label = html.match(/aria-label="(\d[,.]\d)\s*(?:sur|out of)(?:&nbsp;|\s)*5,\s*([^"]{1,40})"/);
  if (label) {
    const rating = parseRating(label[1]);
    if (rating !== null) return { rating, ratingCount: parseRatingCount(label[2]) };
  }
  return null;
}

/** Va chercher la note d'un podcast Apple. null si la page n'en a pas ; lève une erreur si Apple ne répond pas. */
export async function fetchApplePodcastRating(podcastId: number, fetchFn: typeof fetch = fetch): Promise<PodcastRating | null> {
  if (!Number.isSafeInteger(podcastId) || podcastId <= 0) return null;
  const response = await fetchFn(`${PAGE}${podcastId}`, {
    cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(10_000),
    headers: { 'accept-language': 'fr-FR,fr;q=0.9', 'user-agent': 'Mozilla/5.0 (compatible; MerkodBot/1.0)' },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Apple Podcasts page ${response.status}`);
  const html = (await response.text()).slice(0, MAX_BYTES);
  return parseApplePodcastRating(html);
}
