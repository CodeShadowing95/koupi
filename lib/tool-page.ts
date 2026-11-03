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

export function toolPageTitle(tool: string, best: Pick<Code, 'discount'> | undefined) {
  return best ? `Code promo ${tool} : ${best.discount} · Koupi` : `Code promo ${tool} · Koupi`;
}

export function toolPageDescription(tool: string, best: Pick<Code, 'creator' | 'discount' | 'status' | 'expiresOn'> | undefined, count: number) {
  if (!best) return `Pas encore de code promo ${tool} donné par un créateur. Tu en connais un ? Propose-le, Koupi le vérifie.`;
  const others = count - 1;
  const lead = `Code promo ${tool} de ${best.creator} : ${best.discount}`;
  if (others > 0) return `${lead}, et ${others} ${others > 1 ? 'autres codes' : 'autre code'} de créateurs. Chaque code est relié à la vidéo d’où il vient.`;
  return isTrusted(best) ? `${lead}. Source vérifiée par Koupi, reliée à la vidéo d’où vient le code.` : `${lead}. Relié à la vidéo d’où il vient, les votes disent s’il marche.`;
}

/** Phrase de réussite, seulement à partir de 3 votes (en dessous, le taux ne veut rien dire). */
export function votesSummary(code: Pick<Code, 'votes' | 'success'>) {
  return code.votes < 3 ? null : `Marche pour ${code.success} % des ${code.votes} personnes qui ont voté`;
}
