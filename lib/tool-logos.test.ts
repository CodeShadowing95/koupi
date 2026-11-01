import { describe, expect, it } from 'vitest';
import { sealText, toolLogo, usesLogoDev } from './tool-logos';
import manifest from './tool-logos.json';

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
