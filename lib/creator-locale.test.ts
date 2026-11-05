import { describe, expect, it } from 'vitest';
import { creatorLocale, localeLabel, localeShort } from './creator-locale';

describe('pays et langue d’un créateur', () => {
  it('préfère une correction à la main, puis la chaîne YouTube', () => {
    expect(creatorLocale([
      { platform: 'podcast', metrics: { language: 'en' } },
      { platform: 'youtube', metrics: { country: 'FR', language: 'fr' } },
    ])).toEqual({ country: 'FR', language: 'fr' });
    expect(creatorLocale([
      { platform: 'youtube', metrics: { country: 'FR', language: 'fr' } },
      { platform: 'podcast', metrics: { country: 'BE', localeManual: true } },
    ])).toEqual({ country: 'BE', language: 'fr' });
    expect(creatorLocale([])).toEqual({ country: null, language: null });
  });
  it('écrit le pays et la langue', () => {
    expect(localeLabel({ country: 'FR', language: 'fr' })).toBe('🇫🇷 France · Français');
    expect(localeLabel({ country: null, language: 'en' })).toBe('Anglais');
    expect(localeLabel({ country: null, language: null })).toBeNull();
    expect(localeShort({ country: 'CA', language: 'fr' })).toBe('🇨🇦 FR');
    expect(localeShort({ country: null, language: 'en' })).toBe('EN');
  });
});
