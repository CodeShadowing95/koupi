import { describe, expect, it } from 'vitest';
import { clip, creatorOgText, titleSize, toolOgText } from './og-text';

describe('og coupon text', () => {
  it('keeps short text as is', () => expect(clip('Notion', 40)).toBe('Notion'));
  it('cuts long text on a word', () => {
    const cut = clip('Une très longue phrase qui ne tient pas sur l’image du tout', 30);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(30);
    expect(cut).not.toMatch(/\s…$/);
  });
  it('shrinks the title as it grows', () => {
    expect(titleSize('Notion')).toBeGreaterThan(titleSize('Bienvenue au cabinet'));
    expect(titleSize('Bienvenue au cabinet')).toBeGreaterThan(titleSize('Un nom de créateur vraiment très long'));
  });
});


describe('toolOgText', () => {
  it('shows the best discount and its creator, never the code', () => {
    const text = toolOgText('Notion', [{ creator: 'Ali', discount: '-20 %' }]);
    expect(text).toMatchObject({ title: 'Notion', highlight: '-20 %', detail: 'Donné par Ali' });
    expect(JSON.stringify(text)).not.toContain('ALI20');
  });
  it('counts several codes', () => {
    expect(toolOgText('Notion', [{ creator: 'Ali', discount: '-20 %' }, { creator: 'Bea', discount: '-10 %' }]).detail).toBe('2 codes de créateurs, dont celui de Ali');
  });
  it('invites to submit a code when there is none', () => {
    expect(toolOgText('Notion', []).stub).toBe('Propose un code');
  });
});

describe('creatorOgText', () => {
  it('keeps the creator name exactly as given', () => {
    expect(creatorOgText('bienvenue au cabinet', []).title).toBe('bienvenue au cabinet');
  });
  it('lists up to three tools once each', () => {
    const text = creatorOgText('Ali', [{ tool: 'Notion' }, { tool: 'Notion' }, { tool: 'NordVPN' }, { tool: 'Canva' }, { tool: 'Figma' }]);
    expect(text.highlight).toBe('5 codes promo');
    expect(text.detail).toBe('Notion, NordVPN, Canva…');
  });
});
