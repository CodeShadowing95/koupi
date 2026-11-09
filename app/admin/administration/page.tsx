import { getDb } from '@/db';
import { listCreatorUsers } from '@/lib/creator-users-admin';
import { listAuditLog, loadSiteState } from '@/lib/site-settings';
import { listFamiliesWithUniverse, listUniverses } from '@/lib/universes-admin';
import { AdministrationView } from './administration-view';

export const metadata = { title: 'Administration · Admin Merkod' };

export const dynamic = 'force-dynamic';

// Espace Administration (super admin) : univers montrés sur le site, pages du site, mode maintenance, liens d'affiliation, comptes créateurs et journal des gestes faits ici.
export default async function Page() {
  const db = getDb();
  const [state, journal, creatorUsers, universes, families] = await Promise.all([loadSiteState(db), listAuditLog(db, 100), listCreatorUsers(db), listUniverses(db), listFamiliesWithUniverse(db)]);
  return <AdministrationView off={state.off} maintenance={state.maintenance} offerLinks={state.offerLinks} rows={state.rows} journal={journal} creatorUsers={creatorUsers} universes={universes} families={families} />;
}
