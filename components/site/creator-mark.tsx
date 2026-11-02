import Link from 'next/link';
import type { Code } from '@/lib/data';
import { routes } from '@/lib/routes';

const LABELS = { checked: 'Contrôlé par Koupi', verified: 'Créateur vérifié' } as const;
const TITLES = {
  checked: 'Koupi a contrôlé ce compte : il est réel, actif et publie bien sous ce nom.',
  verified: 'Le créateur a prouvé à Koupi que ce compte est le sien.',
} as const;

/** Marque de confiance d'un créateur. Rien tant qu'il est seulement « repéré ». compact : coche seule, à côté d'un nom. */
export function CreatorMark({ level, compact = false, dark = false }: { level: Code['creatorLevel']; compact?: boolean; dark?: boolean }) {
  if (!level) return null;
  if (compact) {
    return <span className={`k-creator-check${level === 'verified' ? ' is-verified' : ''}`} title={`${LABELS[level]}. ${TITLES[level]}`} aria-label={LABELS[level]} role="img">✓</span>;
  }
  return (
    <Link href={routes.transparency} className={`k-status k-status-ok${dark ? ' is-dark' : ''} k-creator-mark`} title={TITLES[level]}>
      ✓ {LABELS[level]}
    </Link>
  );
}
