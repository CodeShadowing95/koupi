// Autocomplétion de l'outil dans « Ajouter une offre » du Studio. Sans base : importable par les composants client.

export type ToolChoice = { slug: string; name: string; site: string };

export const fold = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
export const MIN_CHARS = 3;

/** Les outils du catalogue dont le nom ou le site contient ce qu'il a tapé (dès 3 caractères), ceux qui commencent pareil d'abord. */
export function matchTools(tools: ToolChoice[], query: string, limit = 8): ToolChoice[] {
  const q = fold(query);
  if (q.length < MIN_CHARS) return [];
  const score = (tool: ToolChoice) => {
    const keys = [fold(tool.name), fold(tool.site)];
    if (keys.some(key => key === q)) return 3;
    if (keys.some(key => key.startsWith(q))) return 2;
    return keys.some(key => key.includes(q)) ? 1 : 0;
  };
  return tools.map(tool => ({ tool, score: score(tool) })).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name, 'fr')).slice(0, limit).map(item => item.tool);
}
