import { describe, expect, it } from 'vitest';
import { routes } from './routes';
import { readFileSync } from 'node:fs';
import { categoryRedirects, creatorRewrites, legacyRedirects, movedRedirects } from './legacy-redirects.mjs';
import { parseCsv, slugify } from '../scripts/build-catalog.mjs';

describe('routes', () => {
  it('builds English public paths', () => {
    expect(routes.tool('nordvpn')).toBe('/tools/nordvpn');
    expect(routes.creator('tutorial-stack')).toBe('/@tutorial-stack');
    expect(routes.explore()).toBe('/');
    expect(routes.explore({ family: 'vpn', q: '' })).toBe('/?family=vpn');
    expect(routes.explore({ q: 'eleven labs' })).toBe('/?q=eleven+labs');
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

  it('envoie les anciennes pages Explorer, Codes et Créateurs sur la page principale', () => {
    for (const source of ['/explore', '/codes', '/creators']) expect(movedRedirects).toContainEqual({ source, destination: '/' });
  });

  it('envoie les anciennes pages créateur sur /@nom, que la réécriture sert depuis le dossier creators', () => {
    expect(movedRedirects).toContainEqual({ source: '/creators/:slug', destination: '/@:slug' });
    expect(movedRedirects).toContainEqual({ source: '/creators/:slug/:rest+', destination: '/@:slug/:rest+' });
    expect(legacyRedirects).toContainEqual({ source: '/createurs/:slug', destination: '/@:slug' });
    for (const rewrite of creatorRewrites) {
      const back = movedRedirects.find(redirect => redirect.source === rewrite.destination);
      expect(back?.destination).toBe(rewrite.source);
    }
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
