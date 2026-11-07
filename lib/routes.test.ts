import { describe, expect, it } from 'vitest';
import { routes } from './routes';
import { readFileSync } from 'node:fs';
import { categoryRedirects, legacyRedirects, movedRedirects } from './legacy-redirects.mjs';
import { parseCsv, slugify } from '../scripts/build-catalog.mjs';

describe('routes', () => {
  it('builds English public paths', () => {
    expect(routes.tool('nordvpn')).toBe('/tools/nordvpn');
    expect(routes.creator('tutorial-stack')).toBe('/creators/tutorial-stack');
    expect(routes.creators()).toBe('/creators');
    expect(routes.creators({ platform: 'youtube', theme: 'Banque & finance' })).toBe('/creators?platform=youtube&theme=Banque+%26+finance');
    expect(routes.creators({ platform: '', theme: 'VPN' })).toBe('/creators?theme=VPN');
    expect(routes.search('eleven labs')).toBe('/search?q=eleven%20labs');
    expect(routes.submit()).toBe('/submit');
    expect(routes.submit('o2switch')).toBe('/submit?tool=o2switch');
  });

  it('redirects every old French path to an English one', () => {
    for (const redirect of legacyRedirects) {
      expect(redirect.source).toMatch(/^\/(outils|createurs|recherche|proposer|trousseau|transparence|mentions-legales|confidentialite)/);
      expect(redirect.destination).not.toMatch(/outils|createurs|recherche|proposer|trousseau|transparence|mentions|confidentialite/);
    }
    expect(legacyRedirects).toHaveLength(9);
  });

  it('envoie l’ancienne adresse de la page Explorer sur la page principale', () => {
    expect(movedRedirects).toEqual([{ source: '/explore', destination: '/' }]);
  });

  it('redirige chaque ancienne catégorie vers une catégorie qui existe dans data/', () => {
    const current = new Set(parseCsv(readFileSync('data/categories.csv', 'utf8')).map(row => slugify(row.categorie)));
    expect(categoryRedirects).toHaveLength(10);
    for (const redirect of categoryRedirects) {
      expect(current.has(redirect.source.replace('/categories/', ''))).toBe(false);
      expect(current.has(redirect.destination.replace('/categories/', ''))).toBe(true);
    }
  });
});
