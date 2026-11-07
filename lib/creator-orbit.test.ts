import { describe, expect, it } from 'vitest';
import { drawOrbit, ORBIT_EXAMPLES } from './creator-orbit';

// Hasard rejouable : suite de nombres fixée.
const seeded = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

describe('drawOrbit', () => {
  const pool = Array.from({ length: 20 }, (_, i) => `c${i}`);

  it('tire le bon nombre de créateurs, sans doublon', () => {
    const draw = drawOrbit(pool, 12, [], seeded());
    expect(draw).toHaveLength(12);
    expect(new Set(draw).size).toBe(12);
  });
  it('préfère ceux qui n’étaient pas affichés', () => {
    const current = pool.slice(0, 12);
    const draw = drawOrbit(pool, 12, current, seeded(7));
    expect(draw.filter(item => !current.includes(item))).toHaveLength(8);
  });
  it('avec un petit vivier, garde tout le monde dans un autre ordre', () => {
    const small = ['a', 'b', 'c', 'd', 'e'];
    const draw = drawOrbit(small, 12, small, seeded(3));
    expect([...draw].sort()).toEqual(small);
  });
  it('ne montre que des exemples inventés dans la liste', () => {
    expect(ORBIT_EXAMPLES).toHaveLength(4);
    expect(new Set(ORBIT_EXAMPLES.map(item => item.name)).size).toBe(4);
  });
});
