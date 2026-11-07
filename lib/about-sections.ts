// Sections de la page Présentation (/about). La barre du haut les liste en liens d'ancrage sur cette page,
// et chaque section porte l'id correspondant : une seule liste pour les deux, ils ne peuvent pas se désaccorder.

export type AboutSection = { id: string; label: string; /** Lien mis en avant (la section créateurs). */ accent?: boolean };

export const ABOUT_SECTIONS = [
  { id: 'principe', label: 'Le principe' },
  { id: 'createurs-credites', label: 'Les créateurs' },
  { id: 'regle', label: 'La règle' },
  { id: 'contribuer', label: 'Contribuer' },
  { id: 'espace-createurs', label: 'Tu es créateur ?', accent: true },
] as const satisfies readonly AboutSection[];

export type AboutSectionId = (typeof ABOUT_SECTIONS)[number]['id'];

/** La section à souligner dans la barre : la dernière dont le haut est passé sous la ligne de lecture. */
export function activeSection(tops: { id: string; top: number }[], line: number): string | null {
  let current: string | null = null;
  for (const { id, top } of tops) if (top <= line) current = id;
  return current;
}
