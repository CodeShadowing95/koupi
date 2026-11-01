'use client';
import { useEffect, useState } from 'react';

// Nombre de propositions à traiter, lu depuis l'API admin (même source que la page Propositions).
export function PendingCount() {
  const [count, setCount] = useState<string>('…');
  useEffect(() => {
    fetch('/api/admin/submissions?status=new')
      .then(response => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((body: { submissions?: unknown[] }) => setCount(String(body.submissions?.length ?? 0)))
      .catch(() => setCount('–'));
  }, []);
  return <>{count}</>;
}
