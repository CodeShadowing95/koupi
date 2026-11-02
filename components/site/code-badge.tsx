import type { Code } from '@/lib/data';
import { codeBadge } from '@/lib/code-badge';

/** Badge de confiance d'un code : Testé au paiement, Source vérifiée ou À tester. */
export function CodeBadge({ code, dark = false, withDate = true }: { code: Pick<Code, 'status' | 'lastTestedAt' | 'paymentTestedAt'>; dark?: boolean; withDate?: boolean }) {
  const badge = codeBadge(code, { withDate });
  return <span className={`k-status k-status-${badge.tone}${dark ? ' is-dark' : ''}`} title={badge.title}>{badge.label}</span>;
}
