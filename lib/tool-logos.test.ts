import { describe, expect, it } from 'vitest';
import { sealText, toolLogo, usesLogoDev, withLogosFirst } from './tool-logos';
import manifest from './tool-logos.json';
import { mergeTools } from '../scripts/fetch-logos.mjs';

describe('toolLogo', () => {
  it('trouve un logo par slug ou par nom', () => {
    expect(toolLogo('nordvpn')?.src).toBe('/logos/nordvpn.svg');
    expect(toolLogo('NordVPN')?.src).toBe('/logos/nordvpn.svg');
  });

  it("renvoie null quand il faut afficher l'initiale", () => {
    expect(toolLogo('outil-inconnu')).toBeNull();
  });
});

describe('sealText', () => {
  it('répète le nom en majuscules pour faire le tour du sceau', () => {
    const text = sealText('Qonto', 40);
    expect(text.startsWith('QONTO · CODE CRÉATEUR · ')).toBe(true);
    expect(text.length).toBeGreaterThanOrEqual(40);
  });

  it('ne coupe jamais un nom long', () => {
    expect(sealText('Une marque au nom très long', 10)).toBe('UNE MARQUE AU NOM TRÈS LONG · CODE CRÉATEUR · ');
  });
});

describe('usesLogoDev', () => {
  it('suit la source des logos enregistrés', () => {
    const fromLogoDev = Object.values(manifest as Record<string, { source?: string }>).some(logo => logo.source === 'Logo.dev');
    expect(usesLogoDev()).toBe(fromLogoDev);
  });
});

describe('withLogosFirst', () => {
  it("place d'abord les outils qui ont un logo, en gardant l'ordre", () => {
    const items = ['outil-inconnu', 'NordVPN', 'autre-inconnu', 'Shopify'];
    expect(withLogosFirst(items, name => name)).toEqual(['NordVPN', 'Shopify', 'outil-inconnu', 'autre-inconnu']);
  });
});

describe('fetch-logos : liste des outils', () => {
  const site = (slug: string) => `https://${slug}.com`;

  it("ajoute les outils créés dans l'admin à ceux du catalogue", () => {
    const tools = mergeTools(
      [{ slug: 'notion', name: 'Notion', website: site('notion'), archived: false }],
      [{ slug: 'nordvpn', name: 'NordVPN', website: site('nordvpn') }],
    );
    expect(tools.map(tool => tool.slug)).toEqual(['nordvpn', 'notion']);
  });

  it('garde la version de la base quand un outil est aux deux endroits', () => {
    const tools = mergeTools(
      [{ slug: 'qonto', name: 'Qonto', website: 'https://qonto.fr', archived: false }],
      [{ slug: 'qonto', name: 'Qonto', website: 'https://qonto.com' }],
    );
    expect(tools).toEqual([{ slug: 'qonto', name: 'Qonto', website: 'https://qonto.fr' }]);
  });

  it('ignore les outils archivés, même encore présents dans le catalogue', () => {
    const tools = mergeTools(
      [{ slug: 'ancien', name: 'Ancien', website: site('ancien'), archived: true }],
      [{ slug: 'ancien', name: 'Ancien', website: site('ancien') }],
    );
    expect(tools).toEqual([]);
  });
});
