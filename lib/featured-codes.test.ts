import { describe, expect, it } from 'vitest';
import type { Code } from './data';
import { featuredPool, pageOf, shuffled } from './featured-codes';

const code = (id: string, tool: string, status: Code['status'] = 'pending', success = 0): Code =>
  ({ id, tool, status, success, votes: 0 } as unknown as Code);

describe('featuredPool', () => {
  it('keeps one code per tool, verified first', () => {
    const pool = featuredPool([code('a', 'X'), code('b', 'X', 'verified'), code('c', 'Y')]);
    expect(pool.map(c => c.id)).toEqual(['b', 'c']);
  });

  it('caps the pool', () => {
    const codes = Array.from({ length: 30 }, (_, i) => code(`c${i}`, `T${i}`));
    expect(featuredPool(codes, 10)).toHaveLength(10);
  });
});

describe('shuffled', () => {
  it('returns the same items without changing the input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffled(input, () => 0.3);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  it('changes the order with the random source', () => {
    expect(shuffled([1, 2, 3, 4], () => 0)).not.toEqual([1, 2, 3, 4]);
  });
});

describe('pageOf', () => {
  const order = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  it('walks the pool page by page and wraps around', () => {
    expect(pageOf(order, 0, 3)).toEqual(['a', 'b', 'c']);
    expect(pageOf(order, 1, 3)).toEqual(['d', 'e', 'f']);
    expect(pageOf(order, 2, 3)).toEqual(['g', 'h', 'a']);
  });

  it('never repeats a code on the same page', () => {
    for (let page = 0; page < 10; page++) expect(new Set(pageOf(order, page, 6)).size).toBe(6);
  });

  it('shows everything when the pool is small', () => {
    expect(pageOf(['a', 'b'], 3, 6)).toEqual(['a', 'b']);
  });
});
