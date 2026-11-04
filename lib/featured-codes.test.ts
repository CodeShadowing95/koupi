import { describe, expect, it } from 'vitest';
import type { Code } from './data';
import { featuredPool, shuffled } from './featured-codes';

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

