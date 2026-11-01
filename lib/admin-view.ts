// Choix d'affichage des listes du back-office : cartes ou tableau.
// Le choix est gardé dans le navigateur de l'admin et vaut pour toutes les listes.
export type AdminView = 'cards' | 'table';

export const ADMIN_VIEW_KEY = 'koupi-admin-view';

export function parseAdminView(value: string | null | undefined): AdminView {
  return value === 'table' ? 'table' : 'cards';
}
