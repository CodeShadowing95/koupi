import { describe, expect, it } from 'vitest';
import { CODE_ORIGIN_LABELS, CODE_ORIGINS, isCodeOrigin, suggestionOrigin } from './code-origin';

describe('origine des codes', () => {
  it('a un libellé pour chaque origine', () => {
    expect(CODE_ORIGINS.every(origin => CODE_ORIGIN_LABELS[origin])).toBe(true);
    expect(isCodeOrigin('podcast')).toBe(true);
    expect(isCodeOrigin('tiktok')).toBe(false);
  });
  it('déduit l’origine d’une suggestion de sa source', () => {
    expect(suggestionOrigin('https://www.youtube.com/watch?v=1')).toBe('youtube_search');
    expect(suggestionOrigin('https://youtu.be/1')).toBe('youtube_search');
    expect(suggestionOrigin('https://podcasts.apple.com/fr/podcast/x/id1?i=2')).toBe('podcast');
    expect(suggestionOrigin('pas une adresse')).toBe('podcast');
  });
});
