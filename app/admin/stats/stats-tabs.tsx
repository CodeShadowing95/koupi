// Onglets de Statistiques : de simples liens (?tab=…), pour qu'une adresse ouvre directement le bon onglet.
import Link from 'next/link';
import { STATS_TABS, statsTabHref, type StatsTab } from '@/lib/stats-tabs';

export function StatsTabs({ current }: { current: StatsTab }) {
  return (
    <nav className="adm-tabs adm-stats-tabs" aria-label="Onglets des statistiques">
      {STATS_TABS.map(item => (
        <Link key={item.value} href={statsTabHref(item.value)}
          className="adm-tab" aria-current={current === item.value ? 'page' : undefined}>{item.label}</Link>
      ))}
    </nav>
  );
}
