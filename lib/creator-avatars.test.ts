import { describe, expect, it } from 'vitest';
import { creatorSlug as scriptSlug, videoId } from '../scripts/fetch-avatars.mjs';
import { creatorAvatar } from './creator-avatars';
import { creatorSlug } from './ui';

describe('fetch-avatars', () => {
  it('reads the video id of every YouTube URL shape', () => {
    expect(videoId('https://www.youtube.com/watch?v=0ti_1pQzznM')).toBe('0ti_1pQzznM');
    expect(videoId('https://www.youtube.com/watch?feature=share&v=-1-EXltpcrE')).toBe('-1-EXltpcrE');
    expect(videoId('https://youtu.be/pLQGHJ0IyPI')).toBe('pLQGHJ0IyPI');
    expect(videoId('https://www.youtube.com/shorts/abcdefghijk')).toBe('abcdefghijk');
    expect(videoId('https://example.com')).toBeNull();
  });

  it('names files with the same slug as creator pages', () => {
    for (const name of ['Phil Pallen', "L'entreprise Facile", 'Silicon Carne 🌶️']) expect(scriptSlug(name)).toBe(creatorSlug(name));
  });
});

describe('creatorAvatar', () => {
  it('falls back to initials when no photo was downloaded', () => {
    expect(creatorAvatar('Créateur inconnu')).toBeNull();
  });
});
