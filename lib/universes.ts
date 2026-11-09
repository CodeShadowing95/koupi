// Univers du catalogue (ADR-0046) : « Outils en ligne » et les autres (Beauté et soins, Mode…).
// Un univers caché reste entier dans l'admin, mais le site public ne montre ni ses outils, ni ses codes, ni ses catégories.
import type { Catalog, Universe } from './data';

export const DEFAULT_UNIVERSE = 'outils-en-ligne';

/** Univers montrés sur le site. Sans liste (ancien catalogue), seul l'univers par défaut existe. */
export function visibleUniverses(universes: Universe[] | undefined): Set<string> {
  if (!universes?.length) return new Set([DEFAULT_UNIVERSE]);
  return new Set(universes.filter(universe => universe.visible).map(universe => universe.slug));
}

/** L'élément est-il dans un univers visible ? Sans univers, il est dans « Outils en ligne ». */
export function isShown(item: { universe?: string }, visible: Set<string>) {
  return visible.has(item.universe ?? DEFAULT_UNIVERSE);
}

/** Catalogue vu par le site public : les outils, codes, catégories et familles des univers cachés sont retirés. */
export function publicCatalog(catalog: Catalog): Catalog {
  const visible = visibleUniverses(catalog.universes);
  if (catalog.universes && catalog.universes.every(universe => universe.visible)) return catalog;
  const tools = catalog.tools.filter(tool => isShown(tool, visible));
  return {
    ...catalog,
    tools,
    codes: catalog.codes.filter(code => isShown(code, visible)),
    categories: catalog.categories.filter(category => isShown(category, visible)),
    families: catalog.families.filter(family => isShown(family, visible)),
  };
}
