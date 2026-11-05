import { describe, expect, it } from 'vitest';
import { nextQuery, QUERY_VARIANTS } from './youtube-queries';

const now = new Date('2026-11-05T10:00:00Z');
const yearAgo = new Date('2025-11-05T10:00:00Z');

describe('nextQuery', () => {
  it('commence par « code promo » sur l’année', () => {
    expect(nextQuery('Notion', [], now)).toEqual({ variant: 'code promo', query: 'Notion code promo', publishedAfter: yearAgo });
  });

  it('prend ensuite une formulation jamais essayée', () => {
    const past = [{ variant: 'code promo', searchedAt: new Date('2026-11-01T00:00:00Z') }];
    expect(nextQuery('Notion', past, now)).toMatchObject({ variant: 'code réduction', query: 'Notion code réduction', publishedAfter: yearAgo });
  });

  it('toutes essayées : reprend la plus ancienne, seulement pour les vidéos publiées depuis', () => {
    const past = QUERY_VARIANTS.map((variant, index) => ({ variant, searchedAt: new Date(Date.UTC(2026, 9, 10 + index)) }));
    past.push({ variant: 'code promo', searchedAt: new Date('2026-11-04T00:00:00Z') });
    expect(nextQuery('Notion', past, now)).toEqual({ variant: 'code réduction', query: 'Notion code réduction', publishedAfter: new Date(Date.UTC(2026, 9, 11)) });
  });

  it('ne remonte jamais plus loin qu’un an', () => {
    const past = QUERY_VARIANTS.map(variant => ({ variant, searchedAt: new Date('2024-01-01T00:00:00Z') }));
    expect(nextQuery('Notion', past, now).publishedAfter).toEqual(yearAgo);
  });
});
