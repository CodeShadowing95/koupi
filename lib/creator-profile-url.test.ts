import { describe, expect, it } from 'vitest';
import { handleFromProfileUrl, profileUrlFor } from './creator-accounts-display';

describe('profileUrlFor', () => {
  it('écrit le lien du profil d’après le pseudo, avec ou sans @', () => {
    expect(profileUrlFor('tiktok', '@ana.tt')).toBe('https://www.tiktok.com/@ana.tt');
    expect(profileUrlFor('instagram', 'ana_photo')).toBe('https://www.instagram.com/ana_photo');
    expect(profileUrlFor('x', ' @ana ')).toBe('https://x.com/ana');
    expect(profileUrlFor('twitch', 'ana')).toBe('https://www.twitch.tv/ana');
    expect(profileUrlFor('snapchat', 'ana')).toBe('https://www.snapchat.com/add/ana');
  });
  it('ne devine rien pour un podcast, un site ou un pseudo avec espaces', () => {
    expect(profileUrlFor('podcast', 'Ana')).toBeNull();
    expect(profileUrlFor('other', 'ana')).toBeNull();
    expect(profileUrlFor('instagram', 'Ana Tech')).toBeNull();
    expect(profileUrlFor('tiktok', '@')).toBeNull();
  });
});

describe('handleFromProfileUrl', () => {
  it('lit le pseudo dans le lien du profil', () => {
    expect(handleFromProfileUrl('tiktok', 'https://www.tiktok.com/@ana.tt?lang=fr')).toBe('@ana.tt');
    expect(handleFromProfileUrl('instagram', 'instagram.com/ana_photo/')).toBe('@ana_photo');
    expect(handleFromProfileUrl('x', 'https://twitter.com/ana')).toBe('@ana');
    expect(handleFromProfileUrl('twitch', 'https://m.twitch.tv/ana')).toBe('@ana');
    expect(handleFromProfileUrl('snapchat', 'https://www.snapchat.com/add/ana')).toBe('@ana');
  });
  it('refuse une publication, une vidéo ou un autre réseau', () => {
    expect(handleFromProfileUrl('instagram', 'https://www.instagram.com/p/Cx12/')).toBeNull();
    expect(handleFromProfileUrl('instagram', 'https://www.instagram.com/reel/Cx12/')).toBeNull();
    expect(handleFromProfileUrl('tiktok', 'https://www.tiktok.com/@ana/video/123')).toBeNull();
    expect(handleFromProfileUrl('tiktok', 'https://www.instagram.com/ana')).toBeNull();
    expect(handleFromProfileUrl('instagram', 'https://instagram.com.exemple.fr/ana')).toBeNull();
    expect(handleFromProfileUrl('other', 'https://exemple.fr/ana')).toBeNull();
    expect(handleFromProfileUrl('tiktok', 'pas un lien')).toBeNull();
  });
});
