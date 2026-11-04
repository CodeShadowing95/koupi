import { describe, expect, it } from 'vitest';
import type { Code } from './data';
import { sortToolCodes, toolPageDescription, toolPageTitle, votesSummary } from './tool-page';

const base: Code = {
  id: '1', tool: 'NordVPN', toolSlug: 'nordvpn', creator: 'Tutorial Stack', creatorSlug: 'tutorial-stack', code: 'YTSTACK',
  discount: '76 % + 4 mois offerts', status: 'verified', source: 'https://youtu.be/x', sourceTitle: 'Vidéo', votes: 7, success: 86,
  lastTestedAt: '2026-11-02T10:00:00.000Z', paymentTestedAt: null, expiresOn: null, createdAt: '2026-10-01T00:00:00.000Z',
};
const now = new Date('2026-11-03T12:00:00Z');

describe('fiche outil', () => {
  it('met le code vérifié et encore valable devant, puis le meilleur taux de réussite', () => {
    const toTest = { ...base, id: 'a', status: 'to_test' as const, success: 100 };
    const expired = { ...base, id: 'b', expiresOn: '2026-10-01', success: 99 };
    const verified = { ...base, id: 'c', success: 50 };
    expect(sortToolCodes([toTest, expired, verified], now).map(code => code.id)).toEqual(['c', 'a', 'b']);
  });

  it('titre de page : outil et réduction du meilleur code', () => {
    expect(toolPageTitle('NordVPN', base)).toBe('Code promo NordVPN : 76 % + 4 mois offerts · Merkod');
    expect(toolPageTitle('NordVPN', undefined)).toBe('Code promo NordVPN · Merkod');
  });

  it('description : créateur, réduction et niveau de vérification', () => {
    expect(toolPageDescription('NordVPN', base, 1)).toBe('Code promo NordVPN de Tutorial Stack : 76 % + 4 mois offerts. Source vérifiée par Merkod, reliée à la vidéo d’où vient le code.');
    expect(toolPageDescription('NordVPN', { ...base, status: 'to_test' }, 3)).toBe('Code promo NordVPN de Tutorial Stack : 76 % + 4 mois offerts, et 2 autres codes de créateurs. Chaque code est relié à la vidéo d’où il vient.');
    expect(toolPageDescription('NordVPN', undefined, 0)).toBe('Pas encore de code promo NordVPN donné par un créateur. Tu en connais un ? Propose-le, Merkod le vérifie.');
  });

  it('résumé des votes : rien sous 3 votes', () => {
    expect(votesSummary({ votes: 2, success: 100 })).toBeNull();
    expect(votesSummary({ votes: 7, success: 86 })).toBe('Marche pour 86 % des 7 personnes qui ont voté');
  });
});
