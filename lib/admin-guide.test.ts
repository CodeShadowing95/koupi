import { describe, expect, it } from 'vitest';
import { chapterNumber, chaptersOf, findChapter, guideChapters, guideParts, neighbours, nextUnread, parseRead, totalMinutes } from './admin-guide';

describe('admin guide', () => {
  it('has unique slugs that are safe in a URL', () => {
    const slugs = guideChapters.map(chapter => chapter.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it('puts every chapter in a known part, in the order of the parts', () => {
    const order = guideParts.map(part => part.id);
    const parts = guideChapters.map(chapter => order.indexOf(chapter.part));
    expect(parts.every(index => index >= 0)).toBe(true);
    expect(parts).toEqual([...parts].sort((a, b) => a - b));
    expect(guideParts.every(part => chaptersOf(part.id).length > 0)).toBe(true);
  });

  it('links practice to admin pages only', () => {
    for (const chapter of guideChapters) if (chapter.practice) expect(chapter.practice.href.startsWith('/admin')).toBe(true);
  });

  it('finds chapters and numbers them from 1', () => {
    expect(findChapter('codes')?.title).toBe('Tester et tenir les codes');
    expect(findChapter('nope')).toBeNull();
    expect(chapterNumber('introduction')).toBe(1);
    expect(chapterNumber('nope')).toBe(0);
  });

  it('gives previous and next chapters', () => {
    expect(neighbours('introduction')).toEqual({ previous: null, next: guideChapters[1] });
    expect(neighbours(guideChapters.at(-1)!.slug).next).toBeNull();
    expect(neighbours('nope')).toEqual({ previous: null, next: null });
  });

  it('adds up reading time', () => {
    expect(totalMinutes).toBe(guideChapters.reduce((sum, chapter) => sum + chapter.minutes, 0));
  });

  it('reads saved progress defensively', () => {
    expect(parseRead(null)).toEqual([]);
    expect(parseRead('not json')).toEqual([]);
    expect(parseRead('{"a":1}')).toEqual([]);
    expect(parseRead('["codes","codes","unknown",3]')).toEqual(['codes']);
  });

  it('continues at the first unread chapter', () => {
    expect(nextUnread([])?.slug).toBe('introduction');
    expect(nextUnread(['introduction'])?.slug).toBe('se-reperer');
    expect(nextUnread(guideChapters.map(chapter => chapter.slug))).toBeNull();
  });
});
