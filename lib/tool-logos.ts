import manifest from './tool-logos.json';
import { tools } from './data';

// Logos des outils, servis depuis public/logos/ (générés par scripts/fetch-logos.mjs).
export type ToolLogo = { src: string; bg: string; kind: 'glyph' | 'image' };

const logos = manifest as Record<string, ToolLogo & { source?: string }>;

/** Le logo d'un outil, par son slug ou son nom. null s'il faut afficher l'initiale. */
export function toolLogo(slugOrName: string): ToolLogo | null {
  const slug = logos[slugOrName] ? slugOrName : tools.find(tool => tool.name === slugOrName)?.slug;
  const logo = slug ? logos[slug] : undefined;
  if (!logo || !logo.src.startsWith('/logos/')) return null;
  return { src: logo.src, bg: logo.bg, kind: logo.kind };
}

/** Le texte qui tourne autour du sceau : le nom répété jusqu'à faire le tour. */
export function sealText(name: string, minLength = 26): string {
  const unit = `${name.toUpperCase()} · CODE CRÉATEUR · `;
  let text = unit;
  while (text.length < minLength) text += unit;
  return text;
}
