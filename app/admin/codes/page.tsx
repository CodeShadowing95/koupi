import { getCatalog } from '@/lib/catalog-server';
import { CodesView } from './codes-view';

export default async function Page() {
  const { codes } = await getCatalog();
  return <CodesView codes={codes} />;
}
