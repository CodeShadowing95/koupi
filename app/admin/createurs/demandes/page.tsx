import { getDb } from '@/db';
import { grantedAccessKeys } from '@/lib/creator-auth';
import { bioProvenCreatorIds } from '@/lib/creator-level';
import { listCreatorRequests } from '@/lib/creator-requests';
import { listSubmittedCodes } from '@/lib/creator-self-proof';
import { listPagesToLink } from '@/lib/creator-merge';
import { RequestsView } from './requests-view';

export const metadata = { title: 'Demandes des créateurs · Admin Merkod' };

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const [requests, granted, proven, submitted, toLink] = await Promise.all([listCreatorRequests(db), grantedAccessKeys(db), bioProvenCreatorIds(db), listSubmittedCodes(db), listPagesToLink(db)]);
  return <RequestsView requests={requests} granted={[...granted]} proven={[...proven]} submitted={submitted} toLink={toLink} />;
}
