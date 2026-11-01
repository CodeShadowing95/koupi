import { describe, expect, it } from 'vitest';
import { ADMIN_PAGE_SIZE, pageNumbers, paginate } from './admin-pagination';

const list = Array.from({ length: 76 }, (_, index) => index + 1);

describe('paginate', () => {
  it('coupe la liste par pages de 24', () => {
    const first = paginate(list, 1);
    expect(ADMIN_PAGE_SIZE).toBe(24);
    expect(first.items).toHaveLength(24);
    expect(first).toMatchObject({ page: 1, pageCount: 4, from: 1, to: 24, total: 76 });
  });
  it('renvoie une dernière page partielle', () => {
    expect(paginate(list, 4)).toMatchObject({ page: 4, from: 73, to: 76 });
    expect(paginate(list, 4).items).toEqual([73, 74, 75, 76]);
  });
  it('ramène une page hors limites dans la liste', () => {
    expect(paginate(list, 9).page).toBe(4);
    expect(paginate(list, 0).page).toBe(1);
    expect(paginate(list, Number.NaN).page).toBe(1);
  });
  it('gère une liste vide', () => {
    expect(paginate([], 3)).toMatchObject({ items: [], page: 1, pageCount: 1, from: 0, to: 0, total: 0 });
  });
});

describe('pageNumbers', () => {
  it('affiche toutes les pages quand il y en a peu', () => {
    expect(pageNumbers(1, 4)).toEqual([1, 2, 3, 4]);
  });
  it('remplace les grands trous par « … »', () => {
    expect(pageNumbers(1, 10)).toEqual([1, 2, 'gap', 10]);
    expect(pageNumbers(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10]);
    expect(pageNumbers(10, 10)).toEqual([1, 'gap', 9, 10]);
  });
  it('affiche la page plutôt qu’un « … » pour un trou d’une seule page', () => {
    expect(pageNumbers(4, 10)).toEqual([1, 2, 3, 4, 5, 'gap', 10]);
  });
});
