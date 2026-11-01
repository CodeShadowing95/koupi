import { describe, expect, it } from 'vitest';
import { resist, tearDecision } from './tear';

describe('tearDecision', () => {
  it('tears past a fifth of the stub', () => {
    expect(tearDecision(51, 0, 250)).toBe(true);
    expect(tearDecision(49, 0, 250)).toBe(false);
  });
  it('tears on a quick flick even when short', () => {
    expect(tearDecision(14, 0.8, 250)).toBe(true);
    expect(tearDecision(10, 0.8, 250)).toBe(false);
  });
});

describe('resist', () => {
  it('follows the pointer freely at first', () => {
    expect(resist(20, 250)).toBe(20);
  });
  it('stiffens like paper after 12 % of the stub', () => {
    expect(resist(130, 250)).toBeCloseTo(30 + 100 * 0.22);
  });
  it('never goes backwards or breaks on bad input', () => {
    expect(resist(-40, 250)).toBe(0);
    expect(resist(Number.NaN, 250)).toBe(0);
  });
});
