import { describe, expect, it } from 'vitest';
import { routes } from './routes';
import { legacyRedirects } from './legacy-redirects.mjs';

describe('routes', () => {
  it('builds English public paths', () => {
    expect(routes.tool('nordvpn')).toBe('/tools/nordvpn');
    expect(routes.creator('tutorial-stack')).toBe('/creators/tutorial-stack');
    expect(routes.search('eleven labs')).toBe('/search?q=eleven%20labs');
    expect(routes.submit()).toBe('/submit');
    expect(routes.submit('o2switch')).toBe('/submit?tool=o2switch');
  });

  it('redirects every old French path to an English one', () => {
    for (const redirect of legacyRedirects) {
      expect(redirect.source).toMatch(/^\/(outils|createurs|recherche|proposer|trousseau|transparence|mentions-legales|confidentialite)/);
      expect(redirect.destination).not.toMatch(/outils|createurs|recherche|proposer|trousseau|transparence|mentions|confidentialite/);
    }
    expect(legacyRedirects).toHaveLength(8);
  });
});
