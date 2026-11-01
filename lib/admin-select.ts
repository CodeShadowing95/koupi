// Liste déroulante avec recherche du back-office : quelles options montrer et où déplacer la sélection au clavier.
import { matchesSearch } from './admin-search';

export type SelectOption = {
  value: string;
  label: string;
  /** Texte secondaire affiché en gris et pris en compte par la recherche (ex. la catégorie d'un outil). */
  hint?: string;
  /** Toujours visible, même quand la recherche ne la trouve pas (ex. « + Nouvel outil »). */
  pinned?: boolean;
};

export function filterOptions(options: SelectOption[], query: string): SelectOption[] {
  return options.filter(option => option.pinned || matchesSearch([option.label, option.hint], query));
}

/** Index suivant ou précédent dans la liste, en bouclant. -1 quand la liste est vide. */
export function moveActive(index: number, delta: number, length: number): number {
  if (length === 0) return -1;
  if (index < 0) return delta > 0 ? 0 : length - 1;
  return (index + delta + length) % length;
}
