import type { Metadata } from 'next';
import { routes } from '@/lib/routes';
import { isPublic } from '@/lib/data';
import { getCatalog, getMediaMap } from '@/lib/catalog-server';
import { parseExplore } from '@/lib/explore';
import { Explore } from '@/components/site/explore';
import { VoteInvite } from '@/components/site/vote-invite';
import { JsonLd } from '@/components/json-ld';
import { siteLd } from '@/lib/structured-data';
import { siteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Merkod · Les codes promo des créateurs, vérifiés',
  description: 'Cherche un outil, prends le code du créateur, file l’utiliser. Tous les codes promo donnés en vidéo ou en podcast, vérifiés et crédités, rangés par famille et par catégorie.',
  // Page principale du site. Les rayons changent l'adresse (?family=…) : une seule adresse compte pour Google.
  alternates: { canonical: routes.home },
};

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ categories, families, codes, tools }, media, params] = await Promise.all([getCatalog(), getMediaMap(), searchParams]);
  return (
    <>
      <JsonLd data={siteLd(siteUrl())} />
      <Explore
        codes={codes.filter(isPublic)}
        tools={tools}
        families={families}
        categories={categories.filter(category => category.count > 0).map(({ slug, name, family }) => ({ slug, name, family }))}
        initial={parseExplore(params)}
        now={Date.now()}
        logoDev={media.logoDev}
      />
      <VoteInvite trigger="copy" />
    </>
  );
}
