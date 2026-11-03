import { describe, expect, it } from 'vitest';
import { nextRotation, rotationCreators, shuffled } from './creator-rotation';

describe('shuffled', () => {
  it('keeps every item and does not touch the input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffled(input, () => 0);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect(out).not.toEqual(input);
  });
});

describe('nextRotation', () => {
  it('wraps around after the last name', () => {
    expect(nextRotation(0, 3)).toBe(1);
    expect(nextRotation(2, 3)).toBe(0);
    expect(nextRotation(0, 0)).toBe(0);
  });
});

describe('rotationCreators', () => {
  const codes = [
    { creator: 'A', creatorSlug: 'a' },
    { creator: 'B', creatorSlug: 'b' },
    { creator: 'A', creatorSlug: 'a' },
    { creator: 'C', creatorSlug: 'c' },
  ];
  it('lists each creator once', () => {
    expect(rotationCreators(codes).map(c => c.slug)).toEqual(['a', 'b', 'c']);
  });
  it('puts the given creator first', () => {
    expect(rotationCreators(codes, 'c').map(c => c.slug)).toEqual(['c', 'a', 'b']);
  });
});
