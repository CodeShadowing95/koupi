import { getDb } from '@/db';
import { getCatalog } from '@/lib/catalog-server';
import { sourceStats } from '@/lib/source-stats';
import { parseStatsTab } from '@/lib/stats-tabs';
import { RefreshButton } from '@/components/admin-refresh-button';
import { SourcesTab } from './sources-tab';
import { StatsTabs } from './stats-tabs';
import { StatsView } from './stats-view';
import { UsageTab } from './usage-tab';

export const dynamic = 'force-dynamic';

// Statistiques en trois onglets (?tab=) : catalogue et audience, sources et outils, consommation des API.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const tab = parseStatsTab((await searchParams).tab);
  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Pilotage</span>
            <h1>Statistiques</h1>
            <p>Comment le catalogue évolue et où concentrer tes efforts. Chaque graphique se termine par ce qu’il t’apprend.</p>
          </div>
          {tab === 'consommation' && <div className="adm-head-actions"><RefreshButton /></div>}
        </div>
        <StatsTabs current={tab} />
        {tab === 'catalogue' && <StatsView catalog={await getCatalog()} />}
        {tab === 'sources' && <SourcesTab stats={await sourceStats(getDb())} />}
        {tab === 'consommation' && <UsageTab />}
      </div>
    </main>
  );
}
