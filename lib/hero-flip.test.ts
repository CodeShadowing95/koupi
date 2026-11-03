import { describe, expect, it } from 'vitest';
import { flipFace, nextFlip } from './hero-flip';

describe('nextFlip', () => {
  it('swaps one slot with the head of the queue and queues the old code', () => {
    const result = nextFlip({ slots: ['a', 'b', 'c', 'd'], queue: ['e', 'f'] }, -1, () => 0.5);
    expect(result?.slot).toBe(2);
    expect(result?.state).toEqual({ slots: ['a', 'b', 'e', 'd'], queue: ['f', 'c'] });
  });

  it('never flips the same slot twice in a row', () => {
    for (const r of [0, 0.3, 0.6, 0.99]) {
      expect(nextFlip({ slots: ['a', 'b', 'c'], queue: ['d'] }, 1, () => r)?.slot).not.toBe(1);
    }
  });

  it('does nothing without spare codes', () => {
    expect(nextFlip({ slots: ['a', 'b'], queue: [] }, -1)).toBeNull();
    expect(nextFlip({ slots: [], queue: ['a'] }, -1)).toBeNull();
  });

  it('never shows the same code twice at once', () => {
    let state = { slots: ['a', 'b', 'c', 'd'], queue: ['e', 'f', 'g'] };
    let last = -1;
    for (let i = 0; i < 50; i++) {
      const next = nextFlip(state, last, () => (i * 0.37) % 1)!;
      state = next.state; last = next.slot;
      expect(new Set(state.slots).size).toBe(4);
      expect(new Set([...state.slots, ...state.queue]).size).toBe(7);
    }
  });
});

describe('flipFace', () => {
  it('keeps the card face-on and swaps on the first edge', () => {
    expect(flipFace(0)).toEqual({ rotation: 0, swapped: false });
    expect(flipFace(89)).toEqual({ rotation: 89, swapped: false });
    expect(flipFace(91)).toEqual({ rotation: -89, swapped: true });
    expect(flipFace(180)).toEqual({ rotation: 0, swapped: true });
    expect(flipFace(271)).toEqual({ rotation: -89, swapped: true });
    expect(flipFace(360)).toEqual({ rotation: 0, swapped: true });
  });
});
