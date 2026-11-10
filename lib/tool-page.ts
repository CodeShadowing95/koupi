// Fiche outil (page d'arrivée depuis « code promo <outil> ») : ordre des codes, titre et description de la page.
import type { Code } from './data';
import { expiryOf } from './code-expiry';

/** Un code vérifié dont la date de fin n'est pas passée : celui qu'on peut recommander en premier. */
export function isTrusted(code: Pick<Code, 'status' | 'expiresOn'>, now?: Date) {
  return code.status === 'verified' && expiryOf(code.expiresOn, now).state !== 'expired';
}

/** Les codes recommandables d'abord, puis le meilleur taux de réussite. */
export function sortToolCodes(codes: Code[], now?: Date): Code[] {
  return [...codes].sort((a, b) => (isTrusted(a, now) ? 0 : 1) - (isTrusted(b, now) ? 0 : 1) || b.success - a.success);
}

/**
 * La réduction, seulement quand elle dit ce qu'on gagne (« -20 % », « 3 mois offerts ») et tient dans un titre.
 * Les textes de remplacement (« Offre du créateur », « Voir la vidéo ») n'apprennent rien au chercheur : null.
 */
export function searchableDiscount(discount: string): string | null {
  const text = discount.trim();
  if (!text || text.length > 40) return null;
  return /\d|offert|gratuit|free|essai/i.test(text) ? text : null;
}

/** Titre de la fiche outil, daté du mois (`seoMonth`) : « Code promo Canva novembre 2026 : 25% off · Merkod ». */
export function toolPageTitle(tool: string, best: Pick<Code, 'discount'> | undefined, month: string) {
  const discount = best && searchableDiscount(best.discount);
  return discount ? `Code promo ${tool} ${month} : ${discount} · Merkod` : `Code promo ${tool} ${month} · Merkod`;
}

export function toolPageDescription(tool: string, best: Pick<Code, 'creator' | 'discount' | 'status' | 'expiresOn'> | undefined, count: number) {
  if (!best) return `Pas encore de code promo ${tool} donné par un créateur. Tu en connais un ? Propose-le, Merkod le vérifie.`;
  const others = count - 1;
  const discount = searchableDiscount(best.discount);
  const lead = discount ? `Code promo ${tool} de ${best.creator} : ${discount}` : `Code promo ${tool} de ${best.creator}`;
  if (others > 0) return `${lead}, et ${others} ${others > 1 ? 'autres codes' : 'autre code'} de créateurs. Chaque code est relié à la vidéo d’où il vient.`;
  return isTrusted(best) ? `${lead}. Source vérifiée par Merkod, reliée à la vidéo d’où vient le code.` : `${lead}. Relié à la vidéo d’où il vient, les votes disent s’il marche.`;
}

/** Phrase de réussite, seulement à partir de 3 votes (en dessous, le taux ne veut rien dire). */
export function votesSummary(code: Pick<Code, 'votes' | 'success'>) {
  return code.votes < 3 ? null : `Marche pour ${code.success} % des ${code.votes} personnes qui ont voté`;
}
