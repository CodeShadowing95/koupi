// Repère les codes promo dans les notes d'un épisode, sans IA : un code annoncé par « code », « coupon » ou
// « promo code », et un outil du catalogue nommé (ou son site cité) sur la même ligne ou celle d'avant.
// Rien n'est publié : chaque code trouvé arrive « En attente » dans Vérifications, où l'admin décide.
// Un code sans outil du catalogue devient une suggestion d'outil à ajouter, avec le nom deviné du lien voisin.

/** domain : domaine du site officiel (nordvpn.com), pour reconnaître un lien vers l'outil. */
export type CatalogTool = { id: string; name: string; domain?: string | null };
export type FoundCode = { toolId: string; code: string; discount: string; evidence: string };
export type UnknownToolCode = { name: string; domain: string | null; code: string; discount: string; evidence: string };

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
    // Pas précédé d'un point ou d'une barre : « AI » ne doit pas se lire dans « gradium.ai ». Un nom court
    // (AI, Qi…) se lit à la casse près, sinon « ai » dans « je vous ai » le trouverait.
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}./@])${escape(name)}(?![\\p{L}\\p{N}])`, name.length <= 3 ? 'gu' : 'giu');
    for (const match of text.matchAll(pattern)) found.push({ toolId: tool.id, index: match.index ?? 0 });
    // Le site de l'outil cité (« sur nordvpn.com/podcast ») vaut son nom.
    if (tool.domain) {
      const site = new RegExp(`(?<![\\p{L}\\p{N}.-])${escape(tool.domain)}(?![\\p{L}\\p{N}-])`, 'giu');
      for (const match of text.matchAll(site)) found.push({ toolId: tool.id, index: match.index ?? 0 });
    }
  }
  return found;
}

/** Domaine d'un site (www. retiré, minuscules), null si l'adresse est invalide. */
export function domainOf(url: string): string | null {
  try { return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase() || null; } catch { return null; }
}

const DOMAIN_PATTERN = /(?<![\p{L}\p{N}@.-])(?:https?:\/\/)?(?:www\.)?((?:[a-z0-9-]+\.)+(?:com|fr|io|ai|co|app|net|org|dev|so|eu|de|be|ch|ca|us|uk|me|tv|gg|xyz|tech|store|shop|cloud))(?![\p{L}\p{N}-])/giu;
// Raccourcisseurs, réseaux et hébergeurs de podcast : jamais l'outil sponsorisé.
const NOT_TOOL_DOMAINS = /(^|\.)(bit\.ly|taap\.it|linktr\.ee|tinyurl\.com|youtube\.com|youtu\.be|apple\.com|spotify\.com|instagram\.com|facebook\.com|twitter\.com|x\.com|tiktok\.com|linkedin\.com|lnkd\.in|audiomeans\.fr|acast\.com|ausha\.co|anchor\.fm|podcastics\.com|google\.com|amzn\.to)$/i;

/** Premier outil du catalogue nommé (ou dont le site est cité) dans un texte, sinon null. */
export function catalogToolIn(text: string, tools: CatalogTool[]): string | null {
  return toolPositions(text, tools).sort((a, b) => a.index - b.index)[0]?.toolId ?? null;
}

/** Premier site d'outil cité dans un texte (hors raccourcisseurs, réseaux et hébergeurs), sinon null. */
export function toolDomainIn(text: string): string | null {
  for (const match of text.matchAll(DOMAIN_PATTERN)) {
    const domain = match[1].toLowerCase();
    if (!NOT_TOOL_DOMAINS.test(domain)) return domain;
  }
  return null;
}

/** Le nom deviné de l'outil : domaine du lien le plus proche, sinon le mot qui ouvre la ligne avant « : ». */
function guessTool(line: string, previous: string | undefined): { name: string; domain: string | null } | null {
  for (const text of [line, previous ?? '']) {
    for (const match of text.matchAll(DOMAIN_PATTERN)) {
      const domain = match[1].toLowerCase();
      if (NOT_TOOL_DOMAINS.test(domain)) continue;
      const label = domain.split('.').slice(-2)[0];
      return { name: label.charAt(0).toUpperCase() + label.slice(1), domain };
    }
  }
  for (const text of [line, previous ?? '']) {
    const lead = text.match(/^([\p{Lu}][\p{L}\p{N}&' .-]{1,40}?)\s*:/u);
    // Un nom de marque tient en trois mots au plus : « Notre film est dispo : » n'en est pas un.
    if (lead && !/^code/i.test(lead[1]) && lead[1].trim().split(/\s+/).length <= 3) return { name: lead[1].trim(), domain: null };
  }
  return null;
}

function looksLikeCode(candidate: string): boolean {
  if (NOT_CODES.has(candidate.toLowerCase())) return false;
  // Un code s'écrit en majuscules ou contient un chiffre ; un mot en minuscules est sans doute du texte.
  return /[0-9]/.test(candidate) || candidate === candidate.toUpperCase();
}

/** Codes trouvés dans le texte, avec l'outil du catalogue le plus proche. Un même code n'est gardé qu'une fois par outil. */
export function findPromoCodes(text: string, tools: CatalogTool[]): FoundCode[] {
  return scanPromoCodes(text, tools).found;
}

/** Codes pour des outils du catalogue (found) et codes dont l'outil manque au catalogue (unknown). */
export function scanPromoCodes(text: string, tools: CatalogTool[]): { found: FoundCode[]; unknown: UnknownToolCode[] } {
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const results: FoundCode[] = [];
  const unknown: UnknownToolCode[] = [];
  const seen = new Set<string>();
  lines.forEach((line, lineIndex) => {
    for (const match of line.matchAll(CODE_PATTERN)) {
      const code = match[1];
      if (!looksLikeCode(code)) continue;
      const at = match.index ?? 0;
      // L'outil le plus proche sur la ligne ; sinon le dernier nommé sur la ligne d'avant.
      const here = toolPositions(line, tools).sort((a, b) => Math.abs(a.index - at) - Math.abs(b.index - at));
      const before = lineIndex > 0 ? toolPositions(lines[lineIndex - 1], tools).sort((a, b) => b.index - a.index) : [];
      // Une ligne qui nomme son propre outil (« Gradium : … », un lien) ne reprend pas celui de la ligne d'avant.
      const ownGuess = here[0] ? null : guessTool(line, undefined);
      const tool = here[0] ?? (ownGuess ? undefined : before[0]);
      const discount = line.match(DISCOUNT_PATTERN)?.[0].trim() ?? (lineIndex > 0 ? lines[lineIndex - 1].match(DISCOUNT_PATTERN)?.[0].trim() : undefined) ?? 'Voir l’épisode';
      // La ligne d'avant donne souvent le nom de l'outil (« Cuure : cuure.com » puis « (code DOIT) ») : on la garde comme preuve.
      const evidence = (lineIndex > 0 && !here[0] && !ownGuess ? `${lines[lineIndex - 1]}\n${line}` : line).slice(0, 300);
      if (!tool) {
        const guess = ownGuess ?? guessTool(line, lines[lineIndex - 1]);
        if (!guess) continue;
        const key = `?${guess.domain ?? guess.name.toLowerCase()}:${code.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unknown.push({ ...guess, code, discount, evidence });
        continue;
      }
      const key = `${tool.toolId}:${code.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ toolId: tool.toolId, code, discount, evidence: line.slice(0, 300) });
    }
  });
  return { found: results, unknown };
}
