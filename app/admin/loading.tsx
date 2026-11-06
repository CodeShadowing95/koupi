import { AdminSkeleton } from '@/components/admin-skeleton';

// Écran de chargement des pages de l'admin, affiché pendant que le serveur lit la base.
export default function Loading() {
  return <AdminSkeleton />;
}
