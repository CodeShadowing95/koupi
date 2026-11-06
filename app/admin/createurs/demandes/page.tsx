import { getDb } from '@/db';
import { grantedAccessKeys } from '@/lib/creator-auth';
import { provenCreatorIds } from '@/lib/creator-level';
import { listCreatorRequests } from '@/lib/creator-requests';
import { RequestsView } from './requests-view';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const [requests, granted, proven] = await Promise.all([listCreatorRequests(db), grantedAccessKeys(db), provenCreatorIds(db)]);
  return <RequestsView requests={requests} granted={[...granted]} proven={[...proven]} />;
}
