import { HOME_OG_TEXT } from '@/lib/og-text';
import { OG_CONTENT_TYPE, OG_SIZE, ogCouponImage } from '@/components/og-coupon';

// Aperçu de partage par défaut (accueil et pages sans image propre), rendu une fois au build.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Merkod, les codes promo des créateurs, vérifiés';

export default function Image() {
  return ogCouponImage(HOME_OG_TEXT);
}
