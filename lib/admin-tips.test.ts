import { describe, expect, it } from 'vitest';
import { TIPS, tipOfDay } from './admin-tips';

describe('tipOfDay', () => {
  it('keeps the same tip all day in Paris and changes the next day', () => {
    const morning = tipOfDay(new Date('2026-11-01T06:00:00Z'));
    expect(tipOfDay(new Date('2026-11-01T22:30:00Z'))).toBe(morning); // 23 h 30 à Paris
    expect(tipOfDay(new Date('2026-11-02T06:00:00Z'))).not.toBe(morning);
  });
  it('goes through every tip', () => {
    const seen = new Set(Array.from({ length: TIPS.length }, (_, i) => tipOfDay(new Date(Date.UTC(2026, 10, 1 + i, 12)))));
    expect(seen.size).toBe(TIPS.length);
  });
  it('links each tip to an admin page', () => {
    for (const tip of TIPS) expect(tip.href.startsWith('/admin')).toBe(true);
  });
});
