import { getCatalog } from '@/lib/catalog-server';
import { isPublic } from '@/lib/data';
import { HOME_OG_TEXT, creatorOgText } from '@/lib/og-text';
import { OG_CONTENT_TYPE, OG_SIZE, ogCouponImage } from '@/components/og-coupon';

// Aperçu de partage d'une page créateur : son nom, son nombre de codes et les outils concernés.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Les codes promo d’un créateur sur Merkod';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { codes } = await getCatalog();
  const own = codes.filter(code => code.creatorSlug === slug);
  if (!own.length) return ogCouponImage(HOME_OG_TEXT);
  return ogCouponImage(creatorOgText(own[0].creator, own.filter(isPublic)));
}
