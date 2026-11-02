import { describe, expect, it } from 'vitest';
import { initials } from './admin-card';

describe('initials', () => {
  it('prend la première lettre des deux premiers mots', () => {
    expect(initials('Tutorial Stack')).toBe('TS');
    expect(initials('Julien - Facturation électronique')).toBe('JF');
  });
  it('prend les deux premières lettres d’un seul mot', () => expect(initials('AlCodeKing')).toBe('AL'));
  it('ignore la ponctuation et garde les accents', () => expect(initials('« été » chez Ève')).toBe('ÉC'));
  it('renvoie ? pour un nom vide', () => expect(initials('  ')).toBe('?'));
});
