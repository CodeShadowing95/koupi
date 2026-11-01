// Pagination des listes du back-office : 24 éléments par page,
// soit 6 rangées complètes de la grille de cartes (4, 2 ou 1 colonne selon l'écran).
export const ADMIN_PAGE_SIZE = 24;

export type Page<T> = { items: T[]; page: number; pageCount: number; from: number; to: number; total: number };

export function paginate<T>(items: T[], page: number, size = ADMIN_PAGE_SIZE): Page<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (current - 1) * size;
  const slice = items.slice(start, start + size);
  return { items: slice, page: current, pageCount, from: total === 0 ? 0 : start + 1, to: start + slice.length, total };
}

// Numéros à afficher : toujours la première et la dernière page, la page courante
// et ses voisines ; les trous de plus d'une page deviennent « … ».
export function pageNumbers(page: number, pageCount: number): (number | 'gap')[] {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1].filter(n => n >= 1 && n <= pageCount));
  const sorted = [...wanted].sort((a, b) => a - b);
  const result: (number | 'gap')[] = [];
  sorted.forEach((n, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && n - previous === 2) result.push(previous + 1);
    else if (previous !== undefined && n - previous > 2) result.push('gap');
    result.push(n);
  });
  return result;
}
