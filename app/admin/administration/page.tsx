import { getDb } from '@/db';
import { listAuditLog, loadSiteState } from '@/lib/site-settings';
import { AdministrationView } from './administration-view';

export const dynamic = 'force-dynamic';

// Espace Administration (super admin) : pages du site, mode maintenance et journal des gestes faits ici.
export default async function Page() {
  const db = getDb();
  const [state, journal] = await Promise.all([loadSiteState(db), listAuditLog(db, 100)]);
  return <AdministrationView off={state.off} maintenance={state.maintenance} rows={state.rows} journal={journal} />;
}
