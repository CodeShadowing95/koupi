// Recherche du back-office : insensible à la casse, aux accents et aux espaces en trop.
// Chaque mot de la recherche doit apparaître dans au moins un des champs de la carte.
function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export function matchesSearch(fields: (string | null | undefined)[], query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(fields.filter(Boolean).join(' '));
  return words.every(word => haystack.includes(word));
}
