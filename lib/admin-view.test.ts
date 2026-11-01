import { describe, expect, it } from 'vitest';
import { parseAdminView } from './admin-view';

describe('parseAdminView', () => {
  it('garde le tableau quand il a été choisi', () => {
    expect(parseAdminView('table')).toBe('table');
  });
  it('revient aux cartes pour toute autre valeur', () => {
    expect(parseAdminView('cards')).toBe('cards');
    expect(parseAdminView(null)).toBe('cards');
    expect(parseAdminView('grille')).toBe('cards');
  });
});
