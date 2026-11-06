import { getCatalog } from '@/lib/catalog-server';
import { isPublic } from '@/lib/data';
import { HOME_OG_TEXT, toolOgText } from '@/lib/og-text';
import { sortToolCodes } from '@/lib/tool-page';
import { OG_CONTENT_TYPE, OG_SIZE, ogCouponImage } from '@/components/og-coupon';

// Aperçu de partage d'une fiche outil : un coupon avec l'outil, la meilleure réduction et son créateur.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Code promo vérifié sur Merkod';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tools, codes } = await getCatalog();
  const tool = tools.find(item => item.slug === slug);
  if (!tool) return ogCouponImage(HOME_OG_TEXT);
  return ogCouponImage(toolOgText(tool.name, sortToolCodes(codes.filter(code => code.toolSlug === slug && isPublic(code)))));
}
