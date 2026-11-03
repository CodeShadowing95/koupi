import { describe, expect, it } from 'vitest';
import { sourcePlatform } from './source-platform';

describe('sourcePlatform', () => {
  it('reconnaît les réseaux à partir de l\'adresse', () => {
    expect(sourcePlatform('https://www.youtube.com/watch?v=abc')).toBe('youtube');
    expect(sourcePlatform('https://youtu.be/abc')).toBe('youtube');
    expect(sourcePlatform('https://m.youtube.com/watch?v=abc')).toBe('youtube');
    expect(sourcePlatform('https://www.instagram.com/p/xyz/')).toBe('instagram');
    expect(sourcePlatform('https://www.tiktok.com/@lea/video/1')).toBe('tiktok');
    expect(sourcePlatform('https://x.com/lea/status/1')).toBe('x');
    expect(sourcePlatform('https://twitter.com/lea/status/1')).toBe('x');
  });
  it('range les épisodes et les flux dans les podcasts, pas la musique', () => {
    expect(sourcePlatform('https://podcasts.apple.com/fr/podcast/gdiy/id1')).toBe('podcast');
    expect(sourcePlatform('https://open.spotify.com/episode/123')).toBe('podcast');
    expect(sourcePlatform('https://open.spotify.com/track/123')).toBe('other');
    expect(sourcePlatform('https://feeds.example.com/show.rss')).toBe('podcast');
  });
  it('donne « other » pour un site et null sans adresse valide', () => {
    expect(sourcePlatform('https://blog.example.com/article')).toBe('other');
    expect(sourcePlatform('')).toBeNull();
    expect(sourcePlatform('pas une adresse')).toBeNull();
    expect(sourcePlatform('javascript:alert(1)')).toBeNull();
    expect(sourcePlatform('https://notyoutube.com/x')).toBe('other');
  });
});
