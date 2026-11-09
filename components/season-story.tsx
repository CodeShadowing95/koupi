// Image du kit de saison (format story 1080 × 1920), rendue par next/og : à poster en story
// ou à joindre à un post. Elle reprend les couleurs des pages /black-friday et /noel.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { clip } from '@/lib/og-text';
import { KIT_LABEL, type KitKind } from '@/lib/season-kit';

export const STORY_SIZE = { width: 1080, height: 1920 };

const PAPER = '#FFF7E8';
const STUB = '#F4EAD5';
const INK = '#17150F';
const MUTED = '#6B6352';

const THEME: Record<KitKind, { bg: string; glow: string; accent: string; gold: string }> = {
  'black-friday': { bg: '#161412', glow: 'radial-gradient(circle at 80% 8%, rgba(217,119,74,.45), rgba(22,20,18,0) 55%)', accent: '#D9774A', gold: '#F2C27B' },
  noel: { bg: '#123A2C', glow: 'radial-gradient(circle at 20% 6%, rgba(216,52,58,.35), rgba(18,58,44,0) 55%)', accent: '#D8343A', gold: '#F2C27B' },
};

// Flocons fixes (pas d'aléatoire : la même image à chaque rendu).
const FLAKES = [[90, 210, 6], [940, 160, 8], [180, 520, 5], [1000, 610, 6], [60, 980, 7], [1010, 1130, 5], [130, 1480, 6], [980, 1560, 8], [520, 120, 5], [760, 300, 4]];

export type StoryCode = { tool: string; code: string; discount: string };

export async function seasonStoryImage({ kind, year, creator, url, codes }: {
  kind: KitKind; year: number; creator: string; url: string; codes: StoryCode[];
}): Promise<ImageResponse> {
  const display = await readFile(join(process.cwd(), 'app/fonts/bricolage-grotesque-800.ttf'));
  const theme = THEME[kind];
  const shown = codes.slice(0, 5);
  const rest = codes.length - shown.length;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: theme.bg, backgroundImage: theme.glow, padding: '96px 72px 88px', fontFamily: 'Noto Sans', position: 'relative' }}>
        {kind === 'noel' && FLAKES.map(([x, y, r]) => (
          <div key={`${x}-${y}`} style={{ position: 'absolute', left: x, top: y, width: r * 2, height: r * 2, borderRadius: r, background: 'rgba(255,248,238,.55)' }} />
        ))}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Bricolage', fontSize: 56, color: PAPER, letterSpacing: -1 }}>Merkod</span>
          <span style={{ display: 'flex', fontSize: 30, color: INK, background: theme.gold, padding: '10px 24px', borderRadius: 999, letterSpacing: 3, textTransform: 'uppercase' }}>{KIT_LABEL[kind]} {year}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 96 }}>
          <span style={{ fontSize: 40, color: theme.accent, letterSpacing: 2 }}>{kind === 'noel' ? 'Mes codes promo à offrir' : 'Mes codes promo'}</span>
          <span style={{ fontFamily: 'Bricolage', fontSize: creator.length > 16 ? 88 : 116, color: theme.gold, lineHeight: 1, letterSpacing: -3, marginTop: 16 }}>{clip(creator, 26)}</span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28, padding: '56px 0' }}>
          {shown.length === 0 && (
            <div style={{ display: 'flex', background: PAPER, borderRadius: 28, padding: '48px 44px', fontSize: 40, color: MUTED }}>Mes codes arrivent très vite sur Merkod.</div>
          )}
          {shown.map(item => (
            <div key={`${item.tool}-${item.code}`} style={{ display: 'flex', height: 168, background: PAPER, borderRadius: 28, overflow: 'hidden' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 40px' }}>
                <span style={{ fontFamily: 'Bricolage', fontSize: 52, color: INK, letterSpacing: -1 }}>{clip(item.tool, 18)}</span>
                <span style={{ fontSize: 34, color: MUTED, marginTop: 4 }}>{clip(item.discount, 28)}</span>
              </div>
              <div style={{ width: 0, borderLeft: `5px dashed ${INK}`, opacity: 0.22 }} />
              <div style={{ width: 330, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: STUB, padding: '0 20px' }}>
                <span style={{ fontSize: 24, color: MUTED, letterSpacing: 3, textTransform: 'uppercase' }}>{item.code ? 'Code' : 'Offre'}</span>
                <span style={{ fontFamily: 'Bricolage', fontSize: item.code.length > 10 ? 36 : 46, color: INK, marginTop: 4 }}>{item.code ? clip(item.code, 16) : 'Par lien'}</span>
              </div>
            </div>
          ))}
          {rest > 0 && <span style={{ fontSize: 34, color: PAPER, opacity: 0.8 }}>+ {rest} {rest > 1 ? 'autres codes' : 'autre code'} sur ma page</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 34, color: PAPER, opacity: 0.85 }}>Tous mes codes, vérifiés, avec la vidéo d’où ils viennent :</span>
          <span style={{ fontFamily: 'Bricolage', fontSize: url.length > 40 ? 38 : 46, color: theme.gold, marginTop: 14 }}>{url}</span>
        </div>
      </div>
    ),
    { ...STORY_SIZE, fonts: [{ name: 'Bricolage', data: display, weight: 800, style: 'normal' }] },
  );
}
