import { describe, expect, it } from 'vitest';
import { allowedTypos, foldText, fuzzyMatcher, matchScore, typoDistance } from './fuzzy-search';

describe('foldText', () => {
  it('retire accents, espaces, ponctuation et majuscules', () => {
    expect(foldText('Nord VPN')).toBe('nordvpn');
    expect(foldText('Léa Créa')).toBe('leacrea');
    expect(foldText('Notion.so — Pro')).toBe('notionsopro');
  });
});

describe('allowedTypos', () => {
  it('ne tolère aucune faute sur une recherche courte', () => {
    expect([1, 3, 4].map(allowedTypos)).toEqual([0, 0, 0]);
    expect([5, 7].map(allowedTypos)).toEqual([1, 1]);
    expect([8, 12].map(allowedTypos)).toEqual([2, 2]);
  });
});

describe('typoDistance', () => {
  it('compte les fautes pour retrouver la recherche dans le texte', () => {
    expect(typoDistance('canva', 'canava', 2)).toBe(1);
    expect(typoDistance('notion', 'notoin', 2)).toBe(1);
    expect(typoDistance('elevenlabs', 'elevnlabs', 2)).toBe(1);
    expect(typoDistance('surfshark', 'srufshrak', 2)).toBe(2);
  });
  it('trouve la recherche au milieu du texte', () => {
    expect(typoDistance('protonvpn', 'potonv', 2)).toBe(1);
  });
  it("s'arrête au-delà de la limite", () => {
    expect(typoDistance('qonto', 'hostinger', 1)).toBe(2);
  });
});

describe('matchScore', () => {
  it('classe identique, début, contient, puis avec fautes', () => {
    expect(matchScore('Canva', 'canva')).toBe(100);
    expect(matchScore('NordPass', 'nordpas')).toBe(90);
    expect(matchScore('ProtonVPN', 'vpn')).toBe(80);
    expect(matchScore('Canva', 'canava')).toBe(40);
    expect(matchScore('Surfshark', 'srufshrak')).toBe(30);
  });
  it('ne devine pas sur une recherche courte ou trop différente', () => {
    expect(matchScore('Qonto', 'qnto')).toBe(0);
    expect(matchScore('Notion', 'canva')).toBe(0);
    expect(matchScore('Notion', '')).toBe(0);
  });
});

describe('fuzzyMatcher', () => {
  it('rien à tester pour une recherche vide, sinon pardonne espaces et fautes', () => {
    expect(fuzzyMatcher('  ')).toBeNull();
    const hit = fuzzyMatcher('nord vpn')!;
    expect(hit('NordVPN')).toBe(true);
    expect(fuzzyMatcher('pennylan')!('Pennylane')).toBe(true);
    expect(fuzzyMatcher('penylane')!('Pennylane')).toBe(true);
    expect(hit('Surfshark')).toBe(false);
  });
});
