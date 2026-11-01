import { describe, expect, it } from 'vitest';
import { matchesSearch } from './admin-search';

describe('matchesSearch', () => {
  const card = ['YTSTACK', 'NordVPN', 'Tutorial Stack', null];

  it('matches everything when the query is empty', () => {
    expect(matchesSearch(card, '   ')).toBe(true);
  });
  it('ignores case and accents', () => {
    expect(matchesSearch(['Hébergement web'], 'HEBERG')).toBe(true);
    expect(matchesSearch(card, 'nordvpn')).toBe(true);
  });
  it('needs every word, possibly in different fields', () => {
    expect(matchesSearch(card, 'nord tutorial')).toBe(true);
    expect(matchesSearch(card, 'nord surfshark')).toBe(false);
  });
});
