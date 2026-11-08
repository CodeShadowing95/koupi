// Lecture des notes d'un épisode par l'IA, quand elle est active (ADR-0025). L'IA est le lecteur principal : son outil
// et sa réduction priment. Le repérage sans IA (lib/podcast-codes.ts) reste le filet quand elle est coupée, et ajoute
// les codes qu'elle n'a pas vus (l'analyse leur retire alors des points). Chaque code rendu par l'IA figure mot
// pour mot dans les notes (keepVerbatimCodes) ; rien n'est publié, tout passe par Vérifications.
import type { ExtractedCode } from './ai-extract';
import { clip } from './verification';
import { shortLink } from './offer-link';
import { catalogToolIn, notAToolName, toolDomainIn, type CatalogTool, type FoundCode, type UnknownToolCode } from './podcast-codes';

/** Les notes parlent-elles d'une offre ? Sinon, pas d'appel à l'IA. */
export const PROMO_HINT = /(code|coupon|promo|r[ée]duction|discount|remise|offert|offre|\d+\s*%|% off)/i;

export type MergedCode = FoundCode & { expiresOn?: string };
export type MergedUnknown = UnknownToolCode & { expiresOn?: string };

const NO_DISCOUNT = 'Voir l’épisode';
const NO_DISCOUNT_VIDEO = 'Voir la vidéo';

/** Pour une vidéo YouTube : « Voir la vidéo » à la place de « Voir l'épisode » quand la réduction n'est pas écrite. */
export function forVideo<T extends { discount: string }>(items: T[]): T[] {
  return items.map(item => item.discount === NO_DISCOUNT ? { ...item, discount: NO_DISCOUNT_VIDEO } : item);
}

/**
 * Ajoute aux codes repérés sans IA ceux que l'IA a lus. Pour un code lu des deux côtés, l'IA prime : son outil,
 * sa réduction (quand elle en donne une) et sa date de fin. L'outil nommé par l'IA est cherché dans le catalogue
 * (nom, ou site cité près du code) ; sinon le code devient un outil à ajouter.
 */
export function mergeAiCodes(scan: { found: FoundCode[]; unknown: UnknownToolCode[] }, ai: ExtractedCode[], tools: CatalogTool[]): { found: MergedCode[]; unknown: MergedUnknown[] } {
  const found: MergedCode[] = scan.found.map(item => ({ ...item }));
  const unknown: MergedUnknown[] = scan.unknown.map(item => ({ ...item }));
  const extra = (item: ExtractedCode) => ({ ...(item.expiresOn ? { expiresOn: item.expiresOn } : {}), ...(item.link ? { link: item.link } : {}), ...(item.creator ? { creator: item.creator } : {}) });
  // Une offre par lien (code vide) se reconnaît à son lien.
  const keyOf = (entry: { code: string; link?: string }) => entry.code ? entry.code.toLowerCase() : `link:${shortLink(entry.link ?? '')}`;
  for (const item of ai) {
    const key = keyOf(item);
    const aiToolId = item.tool ? catalogToolIn(item.tool, tools) : null;
    // Sans IA, un code est rattaché à l'outil du catalogue le plus proche sur la ligne. Quand l'IA nomme un autre
    // outil (« … et Gradium, code GDIY » après « NordVPN »), on la suit : elle lit la phrase entière.
    const index = found.findIndex(entry => keyOf(entry) === key);
    if (index >= 0 && item.tool && !notAToolName(item.tool) && aiToolId !== found[index].toolId) {
      const [moved] = found.splice(index, 1);
      if (aiToolId) found.push({ ...moved, toolId: aiToolId });
      else unknown.push({ name: clip(item.tool.trim(), 120), domain: toolDomainIn(item.link || item.evidence), code: moved.code, discount: moved.discount, evidence: moved.evidence, ...(moved.link ? { link: moved.link } : {}), ...(item.creator ? { creator: item.creator } : {}) });
    }
    const known = [...found, ...unknown].find(entry => keyOf(entry) === key);
    if (known) {
      // L'IA lit la phrase : sa réduction vaut mieux qu'un pourcentage pris sur la ligne par le repérage.
      if (item.discount.trim()) known.discount = clip(item.discount.trim(), 240);
      Object.assign(known, extra(item));
      continue;
    }
    const discount = clip(item.discount, 240) || NO_DISCOUNT;
    const evidence = clip(item.evidence, 300);
    const toolId = aiToolId || catalogToolIn(`${item.link} ${evidence}`, tools);
    if (toolId) { found.push({ toolId, code: item.code, discount, evidence, ...extra(item) }); continue; }
    // L'IA peut nommer une étiquette (« Avantages ») ou la plateforme qui encaisse (« Thrivecart ») : on ne garde pas ce nom.
    const name = notAToolName(item.tool) ? '' : clip(item.tool.trim(), 120);
    const domain = toolDomainIn(item.link || evidence);
    if (!name && !domain) continue;
    const label = domain?.split('.').slice(-2)[0] ?? '';
    unknown.push({ name: name || label.charAt(0).toUpperCase() + label.slice(1), domain, code: item.code, discount, evidence, ...extra(item) });
  }
  return { found, unknown };
}
