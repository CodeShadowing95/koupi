import { describe, expect, it } from 'vitest';
import { isOutside } from './admin-dialog';

describe('isOutside', () => {
  const panel = { left: 960, top: 0, right: 1440, bottom: 900 };
  it('un clic sur le voile, à gauche du panneau, est dehors', () => expect(isOutside(panel, 400, 300)).toBe(true));
  it('un clic dans le panneau est dedans', () => expect(isOutside(panel, 1200, 300)).toBe(false));
  it('le bord du panneau compte comme dedans', () => expect(isOutside(panel, 960, 0)).toBe(false));
  it('au-dessus ou en dessous d’une fenêtre centrée, c’est dehors', () => {
    const modal = { left: 400, top: 100, right: 1000, bottom: 700 };
    expect(isOutside(modal, 700, 50)).toBe(true);
    expect(isOutside(modal, 700, 750)).toBe(true);
  });
});
