// Textes de la page publique d'un créateur.
import type { Code } from './data';

/** « 1 240 » avec l'espace fine des milliers, comme le reste du site. */
export function formatCopies(count: number): string {
  return new Intl.NumberFormat('fr-FR').format(count).replace(/\s/g, ' ');
}

/** Description pour Google et le partage : sa présentation si elle existe, sinon ses outils. 160 caractères au plus. */
export function creatorDescription(name: string, codes: Pick<Code, 'tool'>[], bio: string | null): string {
  const toolNames = [...new Set(codes.map(code => code.tool))];
  const shown = toolNames.slice(0, 3).join(', ') + (toolNames.length > 3 ? '…' : '');
  const lead = `${codes.length} code${codes.length > 1 ? 's' : ''} promo donné${codes.length > 1 ? 's' : ''} par ${name}`;
  const text = bio ? `${lead}. ${bio.replace(/\s+/g, ' ')}` : `${lead} : ${shown}. Chaque code avec la vidéo ou le post d'où il vient.`;
  return text.length > 160 ? `${text.slice(0, 159).trimEnd()}…` : text;
}
