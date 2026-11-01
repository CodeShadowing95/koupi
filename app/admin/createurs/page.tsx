import { getDb } from '@/db';
import { listCreatorsAdmin } from '@/lib/catalog-admin';
import { CreatorsView } from './creators-view';

export const dynamic = 'force-dynamic';

export default async function Page() {
  return <CreatorsView creators={await listCreatorsAdmin(getDb())} />;
}
