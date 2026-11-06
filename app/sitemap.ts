import type { MetadataRoute } from 'next';
import { getCatalog } from '@/lib/catalog-server';
import { getSiteState } from '@/lib/site-settings-server';
import { sitemapEntries, siteUrl } from '@/lib/seo';

// sitemap.xml : toutes les pages publiques (outils, créateurs, catégories…), lues dans le catalogue en cache.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [catalog, { off }] = await Promise.all([getCatalog(), getSiteState()]);
  return sitemapEntries(catalog, off, siteUrl());
}
