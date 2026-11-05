import { describe, expect, it } from 'vitest';
import { countryFlag, countryName, guessLanguage, languageName, normalizeCountry, normalizeLanguage } from './language-guess';

describe('langue devinée', () => {
  it('reconnaît le français et l’anglais', () => {
    expect(guessLanguage('Le podcast qui donne la parole aux entrepreneurs et à ceux qui font bouger les lignes, chaque semaine.')).toBe('fr');
    expect(guessLanguage('The show where we talk about how to build a business and what it takes to grow your audience.')).toBe('en');
    expect(guessLanguage('Tutoriels de code : on apprend le JavaScript et le React pas à pas, avec des projets concrets pour vous.')).toBe('fr');
  });
  it('ne devine rien sur un texte trop court ou ambigu', () => {
    expect(guessLanguage('GDIY')).toBeNull();
    expect(guessLanguage('Tech news AI SaaS code review dev')).toBeNull();
  });
  it('normalise les codes', () => {
    expect(normalizeLanguage('fr-FR')).toBe('fr');
    expect(normalizeLanguage('EN_us')).toBe('en');
    expect(normalizeLanguage('français')).toBeNull();
    expect(normalizeCountry('fr')).toBe('FR');
    expect(normalizeCountry('FRA')).toBeNull();
  });
  it('écrit les noms et le drapeau', () => {
    expect(languageName('fr')).toBe('Français');
    expect(countryName('BE')).toBe('Belgique');
    expect(countryFlag('FR')).toBe('🇫🇷');
    expect(countryFlag('xx')).toBe('');
  });
});
