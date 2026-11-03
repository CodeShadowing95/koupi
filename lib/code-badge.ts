// Badge de confiance d'un code sur le site. Deux niveaux de vérification (spec « vérifications assistées ») :
// « Source vérifiée » (le code vient bien du créateur) et « Testé au paiement » (la réduction s'applique), daté.
import type { Code } from './data';
import { expiryOf } from './code-expiry';

export type CodeBadge = {
  tone: 'ok' | 'warn'; label: string; title: string;
  /** Pastille posée sur le logo de l'outil (page des codes) : coche verte, coche dorée, sablier ou point d'exclamation. */
  seal: 'paid' | 'verified' | 'to_test' | 'expired';
};

const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });

export function codeBadge(code: Pick<Code, 'status' | 'lastTestedAt' | 'paymentTestedAt'> & { expiresOn?: string | null }, options: { withDate?: boolean; now?: Date } = {}): CodeBadge {
  const withDate = options.withDate ?? true;
  // Date de fin passée : on ne promet plus rien tant que Koupi n'a pas revérifié.
  if (expiryOf(code.expiresOn, options.now).state === 'expired') {
    return { tone: 'warn', seal: 'expired', label: '◷ Peut-être expiré', title: 'La date de fin donnée par le créateur est passée. Koupi va revérifier ce code.' };
  }
  if (code.status === 'verified' && code.paymentTestedAt) {
    return {
      tone: 'ok', seal: 'paid',
      label: `✓ Testé au paiement${withDate ? ` le ${day(code.paymentTestedAt)}` : ''}`,
      title: 'Koupi a essayé ce code jusqu’au paiement : la réduction s’appliquait.',
    };
  }
  if (code.status === 'verified') {
    return {
      tone: 'ok', seal: 'verified',
      label: `✓ Source vérifiée${withDate && code.lastTestedAt ? ` le ${day(code.lastTestedAt)}` : ''}`,
      title: 'Koupi a vérifié que ce code est bien donné par le créateur, dans sa source publique.',
    };
  }
  return { tone: 'warn', seal: 'to_test', label: '◷ À tester', title: 'Ce code n’a pas encore été vérifié par Koupi. Les votes disent s’il marche.' };
}

/** Ligne de date de fin à afficher sous le badge, ou null (pas de date, ou date passée déjà dite par le badge). */
export function expiryNote(expiresOn: string | null | undefined, now?: Date): { label: string; daysLeft: number; tone: 'neutral' | 'warn' } | null {
  const expiry = expiryOf(expiresOn, now);
  if (expiry.state === 'none' || expiry.state === 'expired') return null;
  return { label: expiry.label, daysLeft: expiry.daysLeft, tone: expiry.state === 'later' ? 'neutral' : 'warn' };
}
