import type { MetadataRoute } from 'next';
import { isIndexable, robotsRules, siteUrl } from '@/lib/seo';

// robots.txt : la production est ouverte à Google (sauf admin, API, espace créateur, recherche),
// la pré-production est fermée pour ne pas faire concurrence au vrai site.
export default function robots(): MetadataRoute.Robots {
  return robotsRules(isIndexable(), siteUrl());
}
