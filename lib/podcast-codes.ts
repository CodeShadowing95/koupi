// Repère les codes promo dans les notes d'un épisode, sans IA : un code annoncé par « code », « coupon » ou
// « promo code », et un outil du catalogue nommé (ou son site cité) sur la même ligne ou celle d'avant.
// Rien n'est publié : chaque code trouvé arrive « En attente » dans Vérifications, où l'admin décide.
// Un code sans outil du catalogue devient une suggestion d'outil à ajouter, avec le nom deviné du lien voisin.

import { clip, implausibleCode } from './verification';

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
/** Liens vers une plateforme de paiement ou de vente : la ligne vend le produit du créateur (formation, livre), pas un outil. */
const PAYMENT_DOMAINS = /(^|\.)(thrivecart\.com|systeme\.io|gumroad\.com|podia\.com|kajabi\.com|teachable\.com|learnybox\.com|schoolmaker\.co|lemonsqueezy\.com|sellfy\.com|stripe\.com|paypal\.com|paypal\.me|sumup\.com|payhip\.com|samcart\.com|tipeee\.com|patreon\.com|ulule\.com|kisskissbankbank\.com)$/i;
/** Plateformes de paiement ou de vente : elles encaissent pour le créateur (une formation, un livre), ce ne sont pas les outils en promotion. */
const PAYMENT_PLATFORMS = new Set(['thrivecart', 'systeme', 'systeme.io', 'gumroad', 'podia', 'kajabi', 'teachable', 'learnybox', 'schoolmaker', 'lemon squeezy', 'lemonsqueezy', 'sellfy', 'stripe', 'paypal', 'sumup', 'payhip', 'samcart', 'tipeee', 'patreon', 'ulule', 'kisskissbankbank']);
/** Mots qui ouvrent une ligne comme une étiquette (« Avantages : avec le code… ») et pas comme un nom d'outil. */
const LABEL_WORDS = new Set(['avantage', 'avantages', 'offre', 'offres', 'offre spéciale', 'promo', 'promotion', 'réduction', 'reduction', 'remise', 'bonus', 'cadeau', 'lien', 'liens', 'infos', 'info', 'sponsor', 'sponsors', 'partenaire', 'partenaires', 'merci', 'bon plan', 'bons plans', 'exclusivité', 'exclusif', 'inscription', 'ressources', 'à découvrir', 'deal', 'discount', 'offer', 'link', 'links', 'perks', 'benefits']);

/** Faux nom d'outil : une étiquette (« Avantages ») ou une plateforme de paiement (« Thrivecart »). */
export function notAToolName(name: string): boolean {
  const key = name.trim().toLowerCase();
  return LABEL_WORDS.has(key) || PAYMENT_PLATFORMS.has(key);
}

/** Premier outil du catalogue nommé (ou dont le site est cité) dans un texte, sinon null. */
export function catalogToolIn(text: string, tools: CatalogTool[]): string | null {
  return toolPositions(text, tools).sort((a, b) => a.index - b.index)[0]?.toolId ?? null;
}

/** Premier site d'outil cité dans un texte (hors raccourcisseurs, réseaux et hébergeurs), sinon null. */
export function toolDomainIn(text: string): string | null {
  for (const match of text.matchAll(DOMAIN_PATTERN)) {
    const domain = match[1].toLowerCase();
    if (!NOT_TOOL_DOMAINS.test(domain) && !PAYMENT_DOMAINS.test(domain)) return domain;
  }
  return null;
}

/** Le nom deviné de l'outil : domaine du lien le plus proche, sinon le mot qui ouvre la ligne avant « : ». */
function guessTool(line: string, previous: string | undefined): { name: string; domain: string | null } | null {
  for (const text of [line, previous ?? '']) {
    for (const match of text.matchAll(DOMAIN_PATTERN)) {
      const domain = match[1].toLowerCase();
      if (PAYMENT_DOMAINS.test(domain)) return null;
      if (NOT_TOOL_DOMAINS.test(domain)) continue;
      const label = domain.split('.').slice(-2)[0];
      return { name: label.charAt(0).toUpperCase() + label.slice(1), domain };
    }
  }
  for (const text of [line, previous ?? '']) {
    const lead = text.match(/^([\p{Lu}][\p{L}\p{N}&' .-]{1,40}?)\s*:/u);
    // Un nom de marque tient en trois mots au plus : « Notre film est dispo : » n'en est pas un.
    if (lead && !/^code/i.test(lead[1]) && lead[1].trim().split(/\s+/).length <= 3 && !notAToolName(lead[1])) return { name: lead[1].trim(), domain: null };
  }
  return null;
}

function looksLikeCode(candidate: string, after = ''): boolean {
  if (NOT_CODES.has(candidate.toLowerCase())) return false;
  // Un nombre seul (« code 2026 ») ou une clé de licence n'est pas un code promo.
  if (implausibleCode(candidate)) return false;
  // Suivi d'une barre (« 3M3K9/5R92S/… ») : un morceau de clé de licence ou de chemin.
  if (/^\/[A-Za-z0-9]/.test(after)) return false;
  // Un mot en capitales suivi d'un autre mot en capitales est un titre qui crie (« Claude Code is SOMETHING ELSE! »), pas un code.
  if (/^[A-Za-z]+$/.test(candidate) && /^\s+[A-Z]{2,}\b/.test(after)) return false;
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
  // « Code promo LWS : CQ410 » : le mot après « code promo » est le nom de l'outil, le code vient après.
  const toolNames = new Set(tools.flatMap(tool => [tool.name.trim().toLowerCase(), tool.domain?.split('.')[0] ?? ''].filter(Boolean)));
  lines.forEach((line, lineIndex) => {
    for (const match of line.matchAll(CODE_PATTERN)) {
      let code = match[1];
      let end = (match.index ?? 0) + match[0].length;
      if (toolNames.has(code.toLowerCase())) {
        const next = line.slice(end).match(/^\s*[:\-–—]?\s*[«"“'‘[(]?\s*([A-Za-z0-9][A-Za-z0-9_-]{2,29})/u);
        if (!next || toolNames.has(next[1].toLowerCase())) continue;
        code = next[1];
        end += next[0].length;
      }
      if (!looksLikeCode(code, line.slice(end))) continue;
      const at = match.index ?? 0;
      // L'outil le plus proche sur la ligne ; sinon le dernier nommé sur la ligne d'avant.
      const here = toolPositions(line, tools).sort((a, b) => Math.abs(a.index - at) - Math.abs(b.index - at));
      const before = lineIndex > 0 ? toolPositions(lines[lineIndex - 1], tools).sort((a, b) => b.index - a.index) : [];
      // Une ligne qui nomme son propre outil (« Gradium : … », un lien) ne reprend pas celui de la ligne d'avant.
      const ownGuess = here[0] ? null : guessTool(line, undefined);
      const tool = here[0] ?? (ownGuess ? undefined : before[0]);
      const discount = line.match(DISCOUNT_PATTERN)?.[0].trim() ?? (lineIndex > 0 ? lines[lineIndex - 1].match(DISCOUNT_PATTERN)?.[0].trim() : undefined) ?? 'Voir l’épisode';
      // La ligne d'avant donne souvent le nom de l'outil (« Cuure : cuure.com » puis « (code DOIT) ») : on la garde comme preuve.
      const evidence = clip(lineIndex > 0 && !here[0] && !ownGuess ? `${lines[lineIndex - 1]}\n${line}` : line, 300);
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
      results.push({ toolId: tool.toolId, code, discount, evidence: clip(line, 300) });
    }
  });
  return { found: results, unknown };
}
