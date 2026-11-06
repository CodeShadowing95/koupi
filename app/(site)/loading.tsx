import { PageSkeleton } from '@/components/site/page-skeleton';

// Écran de chargement par défaut des pages publiques (catégories, créateurs, recherche…).
export default function Loading() {
  return <PageSkeleton />;
}
