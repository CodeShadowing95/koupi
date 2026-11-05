import { getDb } from '@/db';
import { getCatalog } from '@/lib/catalog-server';
import { usageGauges, usageSummary } from '@/lib/api-usage-summary';
import type { FailedSource, Gauge } from '@/lib/admin-urgent';
import { sourceActivity } from '@/lib/source-runs';
import { RUN_SOURCE_LABELS, type RunSource } from '@/lib/sources';
import { DashboardView } from './dashboard-view';

export const dynamic = 'force-dynamic';

// Sources dont le dernier passage a échoué, et jauges du quota YouTube et du plafond IA.
// Une lecture ratée n'empêche jamais l'accueil de s'afficher : l'alerte est simplement absente.
async function urgentInputs(): Promise<{ failedSources: FailedSource[]; gauges: Gauge[] }> {
  const db = getDb();
  const [activity, summary] = await Promise.all([
    sourceActivity(db).catch(error => { console.error('home source activity failed', error); return null; }),
    usageSummary(db).catch(error => { console.error('home usage failed', error); return null; }),
  ]);
  const failedSources = activity
    ? (Object.entries(activity) as [RunSource, (typeof activity)[RunSource]][])
      .filter(([, item]) => item.lastRun?.status === 'failed')
      .map(([source, item]) => ({ label: RUN_SOURCE_LABELS[source], error: item.lastRun?.error ?? null }))
    : [];
  const gauges = summary ? usageGauges(summary).map(({ key, label, ratio, detail }) => ({ key, label, ratio, detail })) : [];
  return { failedSources, gauges };
}

export default async function Page() {
  const [catalog, urgent] = await Promise.all([getCatalog(), urgentInputs()]);
  return <DashboardView catalog={catalog} urgent={urgent} nowIso={new Date().toISOString()} />;
}
