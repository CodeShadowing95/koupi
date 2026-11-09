import { describe, expect, it } from 'vitest';
import { mergeReports } from './podcast-read-report';

const report = (podcasts: number, remaining: number, code?: string) => ({
  podcasts, episodes: podcasts * 2, found: code ? [{ podcast: 'P', code, tool: 'T' }] : [], suggested: [], failed: [], aiRead: 1, remaining,
});

describe('mergeReports', () => {
  it('additionne les lots et garde le reste du dernier', () => {
    const total = mergeReports(mergeReports(null, report(40, 83, 'A')), report(50, 33, 'B'));
    expect(total).toEqual({ podcasts: 90, episodes: 180, found: [{ podcast: 'P', code: 'A', tool: 'T' }, { podcast: 'P', code: 'B', tool: 'T' }], suggested: [], failed: [], aiRead: 2, remaining: 33 });
  });
});
