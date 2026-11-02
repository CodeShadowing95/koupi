// Repère les codes promo dans les notes d'un épisode, sans IA : un code annoncé par « code », « coupon » ou
// « promo code », et un outil du catalogue nommé sur la même ligne ou celle d'avant. Rien n'est publié :
// chaque code trouvé arrive « En attente » dans Vérifications, où l'admin décide.

export type CatalogTool = { id: string; name: string };
export type FoundCode = { toolId: string; code: string; discount: string; evidence: string };

const CODE_PATTERN = /\b(?:promo\s*code|code\s*promo|code\s*de\s*r[ée]duction|coupon|code)\s*(?::|est|is)?\s*[«"“'‘]?\s*([A-Za-z0-9][A-Za-z0-9_-]{2,29})/giu;
const DISCOUNT_PATTERN = /-?\s?\d+(?:[.,]\d+)?\s?(?:%|€|\$|euros?)|\d+\s(?:mois|semaines?|jours?)\s(?:offerts?|gratuits?)|\d+\s(?:months?|weeks?|days?)\sfree/iu;

// Mots qui suivent « code » sans être un code.
const NOT_CODES = new Set([
  'promo', 'source', 'est', 'est-ce', 'dans', 'pour', 'avec', 'sur', 'chez', 'qui', 'que', 'des', 'les', 'une', 'the', 'for', 'with', 'and', 'you', 'your', 'our',
  'here', 'below', 'link', 'lien', 'gratuit', 'free', 'offert', 'exclusif', 'exclusive', 'special', 'spécial', 'unique', 'disponible', 'available',
]);

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function toolPositions(text: string, tools: CatalogTool[]): { toolId: string; index: number }[] {
  const found: { toolId: string; index: number }[] = [];
  for (const tool of tools) {
    const name = tool.name.trim();
    if (name.length < 2) continue;
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escape(name)}(?![\\p{L}\\p{N}])`, 'giu');
    for (const match of text.matchAll(pattern)) found.push({ toolId: tool.id, index: match.index ?? 0 });
  }
  return found;
}

function looksLikeCode(candidate: string): boolean {
  if (NOT_CODES.has(candidate.toLowerCase())) return false;
  // Un code s'écrit en majuscules ou contient un chiffre ; un mot en minuscules est sans doute du texte.
  return /[0-9]/.test(candidate) || candidate === candidate.toUpperCase();
}

/** Codes trouvés dans le texte, avec l'outil du catalogue le plus proche. Un même code n'est gardé qu'une fois par outil. */
export function findPromoCodes(text: string, tools: CatalogTool[]): FoundCode[] {
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const results: FoundCode[] = [];
  const seen = new Set<string>();
  lines.forEach((line, lineIndex) => {
    for (const match of line.matchAll(CODE_PATTERN)) {
      const code = match[1];
      if (!looksLikeCode(code)) continue;
      const at = match.index ?? 0;
      // L'outil le plus proche sur la ligne ; sinon le dernier nommé sur la ligne d'avant.
      const here = toolPositions(line, tools).sort((a, b) => Math.abs(a.index - at) - Math.abs(b.index - at));
      const before = lineIndex > 0 ? toolPositions(lines[lineIndex - 1], tools).sort((a, b) => b.index - a.index) : [];
      const tool = here[0] ?? before[0];
      if (!tool) continue;
      const key = `${tool.toolId}:${code.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const discount = line.match(DISCOUNT_PATTERN)?.[0].trim() ?? (lineIndex > 0 ? lines[lineIndex - 1].match(DISCOUNT_PATTERN)?.[0].trim() : undefined);
      results.push({ toolId: tool.toolId, code, discount: discount ?? 'Voir l’épisode', evidence: line.slice(0, 300) });
    }
  });
  return results;
}
