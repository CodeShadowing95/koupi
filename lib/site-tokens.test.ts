import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Garde-fou de cohérence du site public : les tailles de texte et les arrondis passent par les jetons
// déclarés en haut de site.css. Seuls les grands titres d'affichage (36 px et plus) peuvent rester en dur.
// La page Explorer a sa propre feuille, tenue aux mêmes jetons.
const css = ['app/(site)/site.css', 'app/(explore)/explore.css', 'app/(studio)/studio.css'].map(file => readFileSync(file, 'utf8')).join('\n');

describe('jetons de design du site public', () => {
  it('déclare l’échelle de texte et les arrondis', () => {
    for (const token of ['--fs-xs', '--fs-md', '--fs-lg', '--fs-page', '--r-sm', '--r-lg', '--r-pill']) expect(css).toContain(`${token}:`);
  });

  it('n’écrit aucune taille de texte courant en pixels', () => {
    const raw = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(match => Number(match[1])).filter(size => size < 36);
    expect(raw).toEqual([]);
  });

  it('n’écrit aucun arrondi en pixels hors des jetons (sauf 2 px pour les très petits éléments)', () => {
    const raw = [...css.matchAll(/border-radius:([^;}]+)/g)].flatMap(match => [...match[1].matchAll(/(\d+)px/g)].map(px => Number(px[1]))).filter(px => px > 2);
    expect(raw).toEqual([]);
  });

  // Sur téléphone, un :hover reste collé après un appui : il ne vaut que pour une souris (voir app/mobile.css).
  it('réserve chaque :hover aux appareils qui survolent vraiment', () => {
    const loose: string[] = [];
    const stack: boolean[] = [];
    let prelude = '';
    for (const char of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
      if (char === '{') {
        const head = prelude.trim();
        const gated = stack.includes(true) || (head.startsWith('@media') && head.includes('hover: hover') && head.includes('pointer: fine'));
        if (!head.startsWith('@') && head.includes(':hover') && !stack.includes(true)) loose.push(head);
        stack.push(gated);
        prelude = '';
      } else if (char === '}') { stack.pop(); prelude = ''; }
      else if (char === ';') prelude = '';
      else prelude += char;
    }
    expect(loose).toEqual([]);
  });

  it('n’utilise pas 100vh, trop haut sur téléphone quand la barre du navigateur est visible', () => {
    expect(css.match(/\b100vh\b/g) ?? []).toEqual([]);
  });
});
