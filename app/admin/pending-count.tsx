'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Nombre de propositions à traiter, lu depuis l'API admin (même source que la page Propositions).
// null tant que le nombre n'est pas connu ou si l'API ne répond pas.
export const SUBMISSIONS_CHANGED = 'koupi:submissions-changed';

export function usePendingSubmissions(): number | null {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    const load = () => fetch('/api/admin/submissions?status=new')
      .then(response => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((body: { submissions?: unknown[] }) => { if (active) setCount(body.submissions?.length ?? 0); })
      .catch(() => { if (active) setCount(null); });
    void load();
    window.addEventListener(SUBMISSIONS_CHANGED, load);
    window.addEventListener('focus', load);
    return () => { active = false; window.removeEventListener(SUBMISSIONS_CHANGED, load); window.removeEventListener('focus', load); };
  }, [pathname]);
  return count;
}

export function PendingCount() {
  const count = usePendingSubmissions();
  return <>{count ?? '–'}</>;
}

/** Pastille avec le nombre de propositions à valider. Rien n'est affiché s'il n'y en a pas. */
export function PendingBadge() {
  const count = usePendingSubmissions();
  if (!count) return null;
  return <span className="adm-count-badge" aria-label={`${count} à valider`}>{count > 99 ? '99+' : count}</span>;
}
