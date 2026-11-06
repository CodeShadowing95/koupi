// Image d'aperçu de partage (WhatsApp, LinkedIn, X…) en forme de coupon Merkod, rendue par next/og.
// Utilisée par les fichiers opengraph-image de l'accueil, des fiches outils et des pages créateurs.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { clip, titleSize, type OgText } from '@/lib/og-text';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

const NIGHT = '#07081A';
const PAPER = '#FFF7E8';
const INK = '#17150F';
const MUTED = '#6B6352';
const CORAL = '#FF6A3D';
const BLUE = '#6E7DFF';

export async function ogCouponImage({ eyebrow, title, highlight, detail, stub }: OgText): Promise<ImageResponse> {
  const display = await readFile(join(process.cwd(), 'app/fonts/bricolage-grotesque-800.ttf'));
  const shownTitle = clip(title, 40);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: NIGHT, padding: '56px 64px', fontFamily: 'Noto Sans' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
          <span style={{ fontFamily: 'Bricolage', fontSize: 44, color: PAPER, letterSpacing: -1 }}>Merkod</span>
          <span style={{ fontSize: 26, color: '#B3B7CF' }}>Le code du créateur, vérifié.</span>
        </div>
        <div style={{ flex: 1, display: 'flex', background: PAPER, borderRadius: 28, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 56px' }}>
            <span style={{ fontSize: 26, color: CORAL, letterSpacing: 4, textTransform: 'uppercase' }}>{eyebrow}</span>
            <span style={{ fontFamily: 'Bricolage', fontSize: titleSize(shownTitle), color: INK, lineHeight: 1.02, letterSpacing: -2, marginTop: 12 }}>{shownTitle}</span>
            {highlight && <span style={{ fontFamily: 'Bricolage', fontSize: 44, color: '#2A3BD6', marginTop: 18 }}>{clip(highlight, 42)}</span>}
            {detail && <span style={{ fontSize: 28, color: MUTED, marginTop: 14 }}>{clip(detail, 60)}</span>}
          </div>
          <div style={{ width: 0, borderLeft: `6px dashed ${NIGHT}`, opacity: 0.25 }} />
          <div style={{ width: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, background: '#F4EAD5' }}>
            <span style={{ fontFamily: 'Bricolage', fontSize: 34, color: INK, textAlign: 'center', lineHeight: 1.15 }}>{stub}</span>
            <span style={{ fontSize: 24, color: BLUE, marginTop: 16 }}>merkod.com</span>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: 'Bricolage', data: display, weight: 800, style: 'normal' }] },
  );
}
