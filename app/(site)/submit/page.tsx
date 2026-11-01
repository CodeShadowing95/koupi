import { getCatalog } from '@/lib/catalog-server';
import { SubmitForm } from './submit-form';

export default async function Proposer() {
  const { categories } = await getCatalog();
  return <SubmitForm categories={categories} />;
}
