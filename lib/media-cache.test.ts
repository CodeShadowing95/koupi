import { describe, expect, it } from 'vitest';
import { mediaCacheControl, UNVERSIONED_MEDIA_CACHE, VERSIONED_MEDIA_CACHE } from './media-cache';

describe('mediaCacheControl', () => {
  it('keeps a versioned image for a year in the browser and the CDN', () => {
    expect(mediaCacheControl('https://merkod.com/media/logos/notion.png?v=m3k2a')).toBe(VERSIONED_MEDIA_CACHE);
    expect(VERSIONED_MEDIA_CACHE).toContain('s-maxage=31536000');
    expect(VERSIONED_MEDIA_CACHE).toContain('immutable');
  });

  it('keeps an image without version for one hour only', () => {
    expect(mediaCacheControl('https://merkod.com/media/avatars/underscore.jpg')).toBe(UNVERSIONED_MEDIA_CACHE);
    expect(mediaCacheControl('https://merkod.com/media/avatars/underscore.jpg?v=')).toBe(UNVERSIONED_MEDIA_CACHE);
    expect(UNVERSIONED_MEDIA_CACHE).toContain('s-maxage=3600');
    expect(UNVERSIONED_MEDIA_CACHE).not.toContain('immutable');
  });
});
