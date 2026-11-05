import { describe, expect, it, vi } from 'vitest';
import { fetchApplePodcastRating, parseApplePodcastRating, parseRatingCount } from './apple-podcast-rating';

// Extraits de la page Apple Podcasts de « Génération Do It Yourself » (novembre 2026).
const RATINGS_BLOCK = '<div class="amp-rating svelte-z92vmb" data-testid="rating-component"><div class="stats svelte-z92vmb" role="text"><div class="stats__main svelte-z92vmb" data-testid="amp-rating__average-rating">4,7</div> <div class="stats__total svelte-z92vmb" data-testid="amp-rating__total-text">sur&nbsp;5</div></div> <div class="numbers svelte-z92vmb"><div class="numbers__count svelte-z92vmb" data-testid="amp-rating__rating-count-text">5 281&nbsp;notes</div></div></div>';
const HEADER_LABEL = '<ul class="metadata svelte-qokqcj"><li aria-label="4,7 sur&nbsp;5, 5,3&nbsp;k&nbsp;notes" class="svelte-qokqcj"><span class="star"></span></li></ul>';

describe('note Apple Podcasts', () => {
  it('lit la note et le nombre exact de notes dans « Notes et avis »', () => {
    expect(parseApplePodcastRating(`<html>${HEADER_LABEL}${RATINGS_BLOCK}</html>`)).toEqual({ rating: 4.7, ratingCount: 5281 });
  });

  it('se rabat sur le résumé sous le titre (nombre arrondi)', () => {
    expect(parseApplePodcastRating(`<html>${HEADER_LABEL}</html>`)).toEqual({ rating: 4.7, ratingCount: 5300 });
  });

  it('rend null pour une page sans note', () => {
    expect(parseApplePodcastRating('<html><h1>Nouveau podcast</h1></html>')).toBeNull();
    expect(parseApplePodcastRating('<div data-testid="amp-rating__average-rating">9,9</div>')).toBeNull();
  });

  it('comprend les nombres de notes écrits de plusieurs façons', () => {
    expect(parseRatingCount('12 notes')).toBe(12);
    expect(parseRatingCount('1 note')).toBe(1);
    expect(parseRatingCount('1,234 Ratings')).toBe(1234);
    expect(parseRatingCount('2,1 k notes')).toBe(2100);
    expect(parseRatingCount('1.2M ratings')).toBe(1_200_000);
    expect(parseRatingCount('sans nombre')).toBeNull();
  });

  it('va chercher la page du podcast et ne lit rien pour un identifiant invalide', async () => {
    const fetchFn = vi.fn(async () => new Response(RATINGS_BLOCK, { status: 200 }));
    expect(await fetchApplePodcastRating(1209142994, fetchFn as unknown as typeof fetch)).toEqual({ rating: 4.7, ratingCount: 5281 });
    expect(fetchFn).toHaveBeenCalledWith('https://podcasts.apple.com/fr/podcast/id1209142994', expect.objectContaining({ cache: 'no-store' }));
    expect(await fetchApplePodcastRating(-1, fetchFn as unknown as typeof fetch)).toBeNull();
    const missing = vi.fn(async () => new Response('', { status: 404 }));
    expect(await fetchApplePodcastRating(1, missing as unknown as typeof fetch)).toBeNull();
    const down = vi.fn(async () => new Response('', { status: 503 }));
    await expect(fetchApplePodcastRating(1, down as unknown as typeof fetch)).rejects.toThrow('503');
  });
});
