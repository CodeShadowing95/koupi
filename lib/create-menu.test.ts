import { describe, expect, it } from 'vitest';
import { createActions, creatorIconHref } from './create-menu';

describe('menu « + Créer »', () => {
  it('propose un code, l’espace créateur et un signalement qui emporte la page en cours', () => {
    const actions = createActions({ signedIn: false, from: '/tools/notion' });
    expect(actions.map(action => [action.key, action.href, action.label])).toEqual([
      ['submit', '/submit', 'Proposer un code'],
      ['creator', '/for-creators', 'Créer mon espace créateur'],
      ['report', '/feedback?from=%2Ftools%2Fnotion', 'Signaler une erreur'],
    ]);
  });

  it('mène le créateur connecté à son espace', () => {
    expect(createActions({ signedIn: true, from: '/' })[1]).toMatchObject({ href: '/creator', label: 'Mon espace créateur' });
    expect(creatorIconHref(true)).toBe('/creator');
    expect(creatorIconHref(false)).toBe('/for-creators');
  });

  it('n’emporte pas la page Ton avis elle-même', () => {
    expect(createActions({ signedIn: false, from: '/feedback' })[2].href).toBe('/feedback');
    expect(createActions({ signedIn: false, from: '' })[2].href).toBe('/feedback');
  });
});
