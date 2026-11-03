import { describe, expect, it } from 'vitest';
import { creatorDescription, formatCopies } from './creator-page';

describe('formatCopies', () => {
  it('sépare les milliers', () => {
    expect(formatCopies(7)).toBe('7');
    expect(formatCopies(1240)).toBe('1 240');
  });
});

describe('creatorDescription', () => {
  it('cite ses outils sans présentation', () => {
    expect(creatorDescription('Ana', [{ tool: 'NordVPN' }, { tool: 'Notion' }, { tool: 'NordVPN' }], null))
      .toBe('3 codes promo donnés par Ana : NordVPN, Notion. Chaque code avec la vidéo ou le post d\'où il vient.');
    expect(creatorDescription('Ana', [{ tool: 'A' }, { tool: 'B' }, { tool: 'C' }, { tool: 'D' }], null)).toContain('A, B, C…');
  });

  it('reprend la présentation et coupe à 160 caractères', () => {
    expect(creatorDescription('Ana', [{ tool: 'Notion' }], 'Tests\nd’outils.')).toBe('1 code promo donné par Ana. Tests d’outils.');
    const long = creatorDescription('Ana', [{ tool: 'Notion' }], 'x'.repeat(300));
    expect(long).toHaveLength(160);
    expect(long.endsWith('…')).toBe(true);
  });
});
