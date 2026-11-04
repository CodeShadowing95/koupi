import { describe, expect, it, vi } from 'vitest';
import { prefillFrom, readVideoPrefill } from './submit-prefill';

const catalog = [
  { id: 't1', name: 'NordVPN', domain: 'nordvpn.com' },
  { id: 't2', name: 'Notion', domain: 'notion.so' },
];

describe('pré-remplissage depuis une vidéo YouTube', () => {
  it('garde le nom de la chaîne tel quel et trouve les codes de la description', () => {
    const prefill = prefillFrom({
      title: 'Mes outils de 2026',
      channelTitle: ' bienvenue au cabinet ',
      description: 'NordVPN : -76 % avec le code CABINET\nRien à voir ici\nNotion, code CABINET aussi',
    }, catalog);
    expect(prefill.creator).toBe('bienvenue au cabinet');
    expect(prefill.codes).toEqual([
      { tool: 'NordVPN', code: 'CABINET', discount: '-76 %', known: true },
      { tool: 'Notion', code: 'CABINET', discount: '', known: true },
    ]);
  });

  it('ne lit que les liens de vidéo YouTube, et rien pour une vidéo introuvable', async () => {
    const videos = vi.fn().mockResolvedValue([]);
    expect(await readVideoPrefill('https://example.com/video', { videos }, catalog)).toBeNull();
    expect(videos).not.toHaveBeenCalled();
    expect(await readVideoPrefill('https://youtu.be/abcdefgh', { videos }, catalog)).toBeNull();
    expect(videos).toHaveBeenCalledWith(['abcdefgh']);
  });

  it('renvoie la chaîne même sans code trouvé', async () => {
    const videos = vi.fn().mockResolvedValue([{ id: 'abcdefgh', title: 'Vlog', description: 'Merci d’avoir regardé', channelTitle: 'Ana' }]);
    expect(await readVideoPrefill('https://www.youtube.com/watch?v=abcdefgh', { videos }, catalog)).toEqual({ creator: 'Ana', title: 'Vlog', codes: [] });
  });
});
