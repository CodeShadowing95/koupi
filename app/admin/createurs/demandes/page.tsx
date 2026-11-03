import { getDb } from '@/db';
import { listCreatorRequests } from '@/lib/creator-requests';
import { RequestsView } from './requests-view';

export const dynamic = 'force-dynamic';

export default async function Page() {
  return <RequestsView requests={await listCreatorRequests(getDb())} />;
}
