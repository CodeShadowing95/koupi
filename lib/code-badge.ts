// Badge de confiance d'un code sur le site. Deux niveaux de vérification (spec « vérifications assistées ») :
// « Source vérifiée » (le code vient bien du créateur) et « Testé au paiement » (la réduction s'applique), daté.
import type { Code } from './data';

export type CodeBadge = { tone: 'ok' | 'warn'; label: string; title: string };

const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });

export function codeBadge(code: Pick<Code, 'status' | 'lastTestedAt' | 'paymentTestedAt'>, options: { withDate?: boolean } = {}): CodeBadge {
  const withDate = options.withDate ?? true;
  if (code.status === 'verified' && code.paymentTestedAt) {
    return {
      tone: 'ok',
      label: `✓ Testé au paiement${withDate ? ` le ${day(code.paymentTestedAt)}` : ''}`,
      title: 'Koupi a essayé ce code jusqu’au paiement : la réduction s’appliquait.',
    };
  }
  if (code.status === 'verified') {
    return {
      tone: 'ok',
      label: `✓ Source vérifiée${withDate && code.lastTestedAt ? ` le ${day(code.lastTestedAt)}` : ''}`,
      title: 'Koupi a vérifié que ce code est bien donné par le créateur, dans sa source publique.',
    };
  }
  return { tone: 'warn', label: '◷ À tester', title: 'Ce code n’a pas encore été vérifié par Koupi. Les votes disent s’il marche.' };
}
