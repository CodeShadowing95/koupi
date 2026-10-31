// Petits utilitaires d'affichage partagés par les pages.
export function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Couleur d'avatar stable pour un même nom (5 teintes de la maquette).
export function avatarClass(name: string): string {
  let hash = 7;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 1009;
  return `av-${(hash % 5) + 1}`;
}

export function creatorSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}
