// Tri des listes du back-office et filtre par initiale (A…Z, 0-9, #).
export type SortDir = 'asc' | 'desc';
export type SortValue = string | number | null | undefined;

export type SortField<T> = {
  key: string;
  label: string;
  value: (item: T) => SortValue;
  /** Champ texte : la barre alphabet filtre sur son initiale. */
  text?: boolean;
  /** Sens choisi quand on passe sur ce critère (ex. dates : les plus récentes d'abord). */
  defaultDir?: SortDir;
};

export const DIGITS = '0-9';
export const SYMBOLS = '#';
export const LETTERS: string[] = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', DIGITS, SYMBOLS];

const LIGATURES: Record<string, string> = { Æ: 'A', Œ: 'O', ß: 'S' };

/** Initiale d'un nom : la lettre sans accent, 0-9 pour un chiffre, # pour tout le reste (symbole, emoji…). */
export function initialOf(text: SortValue): string {
  const first = String(text ?? '').trim().charAt(0).toUpperCase();
  if (!first) return SYMBOLS;
  const base = LIGATURES[first] ?? first.normalize('NFD').charAt(0);
  if (base >= 'A' && base <= 'Z') return base;
  if (base >= '0' && base <= '9') return DIGITS;
  return SYMBOLS;
}

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

function compare(a: SortValue, b: SortValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

/** Trie sans modifier la liste d'origine. Les valeurs vides restent toujours à la fin ; à égalité, l'ordre d'origine est gardé. */
export function sortItems<T>(items: T[], value: (item: T) => SortValue, dir: SortDir): T[] {
  const factor = dir === 'asc' ? 1 : -1;
  return items
    .map((item, index) => ({ item, index, key: value(item) }))
    .sort((a, b) => {
      const aEmpty = a.key === null || a.key === undefined || a.key === '';
      const bEmpty = b.key === null || b.key === undefined || b.key === '';
      if (aEmpty || bEmpty) return aEmpty === bEmpty ? a.index - b.index : aEmpty ? 1 : -1;
      return compare(a.key, b.key) * factor || a.index - b.index;
    })
    .map(entry => entry.item);
}

/** Nombre d'éléments par initiale, pour griser les lettres vides. */
export function countByInitial<T>(items: T[], value: (item: T) => SortValue): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const initial = initialOf(value(item));
    counts.set(initial, (counts.get(initial) ?? 0) + 1);
  }
  return counts;
}

export function filterByInitial<T>(items: T[], value: (item: T) => SortValue, letter: string): T[] {
  return letter ? items.filter(item => initialOf(value(item)) === letter) : items;
}
