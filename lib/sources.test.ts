import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NIGHTLY_UTC, nextNightlyRun, publishRate, runStatus } from './sources';

describe('nextNightlyRun', () => {
  it('donne le passage de cette nuit, ou celui de demain s’il est passé', () => {
    expect(nextNightlyRun('podcast', new Date('2026-11-05T02:00:00Z'))).toEqual(new Date('2026-11-05T03:30:00Z'));
    expect(nextNightlyRun('podcast', new Date('2026-11-05T03:30:00Z'))).toEqual(new Date('2026-11-06T03:30:00Z'));
    expect(nextNightlyRun('youtube_channel', new Date('2026-11-30T23:00:00Z'))).toEqual(new Date('2026-12-01T04:00:00Z'));
  });

  it('rien pour une source lancée à la main', () => {
    expect(nextNightlyRun('youtube_search', new Date())).toBeNull();
  });

  it('reste en phase avec les tâches de vercel.json', () => {
    const crons = (JSON.parse(readFileSync('vercel.json', 'utf8')) as { crons: { path: string; schedule: string }[] }).crons;
    for (const slot of Object.values(NIGHTLY_UTC)) {
      expect(crons.find(cron => cron.path === slot!.path)?.schedule).toBe(`${slot!.minute} ${slot!.hour} * * *`);
    }
  });
});

describe('publishRate', () => {
  it('part des codes jugés qui ont été publiés', () => {
    expect(publishRate({ published: 3, rejected: 1 })).toBe(75);
    expect(publishRate({ published: 0, rejected: 0 })).toBeNull();
  });
});

describe('runStatus', () => {
  it('réussi, partiel ou en échec', () => {
    expect(runStatus({ failed: [] }, 3)).toBe('ok');
    expect(runStatus({ failed: ['a'] }, 3)).toBe('partial');
    expect(runStatus({ failed: ['a', 'b'] }, 2)).toBe('failed');
    expect(runStatus({ failed: ['a'] }, 0)).toBe('partial');
  });
});
