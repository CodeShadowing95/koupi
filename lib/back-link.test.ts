import { describe, expect, it } from 'vitest';
import { backTarget, isCodePage } from './back-link';

describe('page du code choisi', () => {
  it('reconnaît la fiche d’un outil, et elle seule', () => {
    expect(isCodePage('/tools/qonto')).toBe(true);
    expect(isCodePage('/tools/qonto/')).toBe(true);
    expect(isCodePage('/tools')).toBe(false);
    expect(isCodePage('/tools/qonto/opengraph-image')).toBe(false);
    expect(isCodePage('/creators/silicon-carne')).toBe(false);
  });
  it('revient à la page d’avant seulement si elle était sur Merkod', () => {
    const origin = 'https://merkod.com';
    expect(backTarget('https://merkod.com/?family=finance', origin, 3)).toBe('history');
    expect(backTarget('https://www.google.com/', origin, 3)).toBe('/');
    expect(backTarget('', origin, 3)).toBe('/');
    expect(backTarget('https://merkod.com/', origin, 1)).toBe('/');
    expect(backTarget('pas une adresse', origin, 3)).toBe('/');
  });
});
