'use client';
// Jauge du bas du menu latéral : quota YouTube du jour et plafond IA du mois, relus chaque minute (ADR-0028).
// Une ligne par service, pour ne pas faire défiler le menu. Un clic ouvre la page Consommation.
// Rien ne s'affiche tant que la lecture n'a pas répondu.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { UsageGauge as Gauge } from '@/lib/api-usage-summary';

const REFRESH_MS = 60_000;
/** Événement à envoyer après une action qui consomme (analyse, liaison de comptes…) : la jauge se relit tout de suite. */
export const USAGE_CHANGED = 'koupi:usage-changed';

export function UsageGauge() {
  const [gauges, setGauges] = useState<Gauge[] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState === 'hidden') return;
      const response = await fetch('/api/admin/usage?gauge=1', { cache: 'no-store' }).catch(() => null);
      const body = response?.ok ? await response.json().catch(() => null) as { gauges?: Gauge[] } | null : null;
      if (alive && body?.gauges) setGauges(body.gauges);
    };
    void load();
    const timer = window.setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', load);
    window.addEventListener(USAGE_CHANGED, load);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', load); window.removeEventListener(USAGE_CHANGED, load); };
  }, []);
  if (!gauges) return null;
  return (
    <Link href="/admin/stats?tab=consommation" className="adm-usage" aria-label="Consommation des API : voir le détail">
      {gauges.map(gauge => (
        <span key={gauge.key} className="adm-usage-row" title={gauge.detail}>
          <span className="adm-usage-name">{gauge.label}</span>
          <span className={`adm-usage-bar is-${gauge.level}`} aria-hidden="true"><i style={{ width: `${Math.max(gauge.ratio * 100, gauge.ratio > 0 ? 3 : 0)}%` }} /></span>
          <b className="adm-usage-value">{Math.round(gauge.ratio * 100)} %</b>
          <span className="sr-only">{gauge.detail}</span>
        </span>
      ))}
    </Link>
  );
}
