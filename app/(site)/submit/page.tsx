import { routes } from '@/lib/routes';
import { getCatalog } from '@/lib/catalog-server';
import { SubmitForm } from './submit-form';

export const metadata = { title: 'Proposer un code · Merkod', description: 'Tu as vu passer un code promo dans une vidéo ? Envoie-le avec sa source : on le vérifie et on crédite le créateur.', alternates: { canonical: routes.submit() } };

export default async function Proposer() {
  const { categories } = await getCatalog();
  return <SubmitForm categories={categories} />;
}
