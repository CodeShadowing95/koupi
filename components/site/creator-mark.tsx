import Link from '@/components/site/site-pages';
import type { Code } from '@/lib/data';
import { routes } from '@/lib/routes';

const LABELS = { checked: 'Contrôlé par Merkod', verified: 'Créateur vérifié' } as const;
const TITLES = {
  checked: 'Merkod a contrôlé ce compte : il est réel, actif et publie bien sous ce nom.',
  verified: 'Le créateur a prouvé à Merkod que ce compte est le sien.',
} as const;

/** Rosette bleue des créateurs : une autre forme que la pastille ronde des codes, pour ne pas confondre les deux. */
function Rosette() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path className="k-rosette-shape" d="M12 1.8l2.5 1.9 3.1-.3 1 3 2.6 1.7-.9 3 .9 3-2.6 1.7-1 3-3.1-.3L12 22.2l-2.5-1.9-3.1.3-1-3-2.6-1.7.9-3-.9-3 2.6-1.7 1-3 3.1.3z" />
      <path className="k-rosette-check" d="m7.8 12.3 2.9 2.9 5.5-5.7" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Marque de confiance d'un créateur. Rien tant qu'il est seulement « repéré ». compact : rosette seule, à côté d'un nom. */
export function CreatorMark({ level, compact = false, dark = false }: { level: Code['creatorLevel']; compact?: boolean; dark?: boolean }) {
  if (!level) return null;
  if (compact) {
    return <span className={`k-creator-check is-${level}`} title={`${LABELS[level]}. ${TITLES[level]}`} aria-label={LABELS[level]} role="img"><Rosette /></span>;
  }
  return (
    <Link href={routes.transparency} className={`k-creator-mark is-${level}${dark ? ' is-dark' : ''}`} title={TITLES[level]}>
      <span className={`k-creator-check is-${level}`} aria-hidden="true"><Rosette /></span>
      {LABELS[level]}
    </Link>
  );
}
