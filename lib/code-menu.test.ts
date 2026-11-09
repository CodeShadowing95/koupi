import { describe, expect, it } from 'vitest';
import { codeMenuItems, reportHref } from './code-menu';

const code = { source: 'https://youtu.be/x', toolSlug: 'incogni', creatorSlug: 'phones-and-drones', tool: 'Incogni', creator: 'Phones And Drones' };

describe('menu ⋮ d’un coupon', () => {
  it('propose la source, la fiche, le créateur, le partage et le signalement', () => {
    const items = codeMenuItems(code, 'youtube');
    expect(items.map(item => item.key)).toEqual(['source', 'tool', 'creator', 'share', 'report']);
    expect(items[0]).toMatchObject({ label: 'Voir la vidéo', href: 'https://youtu.be/x', external: true });
    expect(items[1]).toMatchObject({ label: 'Tous les codes Incogni', href: '/tools/incogni' });
    expect(items[2]).toMatchObject({ label: 'Page de Phones And Drones', href: '/@phones-and-drones' });
  });

  it('adapte le libellé de la source à la plateforme', () => {
    expect(codeMenuItems(code, 'podcast')[0].label).toBe('Écouter l’épisode');
  });

  it('retire ce qui n’existe pas ou n’a pas de sens ici', () => {
    expect(codeMenuItems({ ...code, source: '' }, null).map(item => item.key)).not.toContain('source');
    expect(codeMenuItems(code, 'youtube', { linkTool: false }).map(item => item.key)).not.toContain('tool');
    expect(codeMenuItems({ ...code, toolSlug: '', creatorSlug: '' }, null).map(item => item.key)).toEqual(['source', 'report']);
  });

  it('préremplit le signalement avec la fiche de l’outil', () => {
    expect(reportHref('incogni')).toBe('/feedback?from=%2Ftools%2Fincogni');
    expect(reportHref('')).toBe('/feedback');
  });
});
