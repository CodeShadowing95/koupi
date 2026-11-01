import manifest from './tool-logos.json';
import { tools } from './data';

// Logos des outils, servis depuis public/logos/ (générés par scripts/fetch-logos.mjs).
export type ToolLogo = { src: string; bg: string; kind: 'glyph' | 'image' };

const logos = manifest as Record<string, ToolLogo & { source?: string }>;

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Le logo d'un outil, par son slug ou son nom. null s'il faut afficher l'initiale. */
export function toolLogo(slugOrName: string): ToolLogo | null {
  const slug = logos[slugOrName] ? slugOrName : tools.find(tool => tool.name === slugOrName)?.slug ?? slugify(slugOrName);
  const logo = slug ? logos[slug] : undefined;
  if (!logo || !logo.src.startsWith('/logos/')) return null;
  return { src: logo.src, bg: logo.bg, kind: logo.kind };
}

/** Vrai si au moins un logo vient de Logo.dev : leur plan gratuit demande un lien d'attribution. */
export function usesLogoDev(): boolean {
  return Object.values(logos).some(logo => logo.source === 'Logo.dev');
}

/** Met en premier les éléments dont l'outil a un vrai logo, sans changer l'ordre à l'intérieur de chaque groupe. */
export function withLogosFirst<T>(items: T[], toolOf: (item: T) => string): T[] {
  const withLogo = items.filter(item => toolLogo(toolOf(item)));
  return [...withLogo, ...items.filter(item => !withLogo.includes(item))];
}

/** Le texte qui tourne autour du sceau : le nom répété jusqu'à faire le tour. */
export function sealText(name: string, minLength = 26): string {
  const unit = `${name.toUpperCase()} · CODE CRÉATEUR · `;
  let text = unit;
  while (text.length < minLength) text += unit;
  return text;
}
