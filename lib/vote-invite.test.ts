import { describe, expect, it } from 'vitest';
import { initialPhase, markInviteSeen, nextPhase, readInviteSeen, VOTE_INVITE_KEY } from './vote-invite';

describe('nextPhase (copy)', () => {
  it('waits for a copy, then for the visitor to come back', () => {
    let phase = initialPhase(false);
    phase = nextPhase(phase, 'visible', 'copy');
    expect(phase).toBe('idle');
    phase = nextPhase(phase, 'copy', 'copy');
    expect(phase).toBe('waiting');
    phase = nextPhase(phase, 'hidden', 'copy');
    expect(phase).toBe('away');
    expect(nextPhase(phase, 'timeout', 'copy')).toBe('away');
    expect(nextPhase(phase, 'visible', 'copy')).toBe('open');
  });

  it('opens after a delay when the tab never lost focus', () => {
    expect(nextPhase('waiting', 'timeout', 'copy')).toBe('open');
  });

  it('ignores arrival in copy mode', () => {
    expect(nextPhase('idle', 'arrive', 'copy')).toBe('idle');
  });
});

describe('nextPhase (arrival)', () => {
  it('opens on arrival and ignores copies', () => {
    expect(nextPhase('idle', 'arrive', 'arrival')).toBe('open');
    expect(nextPhase('idle', 'copy', 'arrival')).toBe('idle');
  });
});

describe('close and reopen', () => {
  it('closes to done and only the button reopens it', () => {
    expect(nextPhase('open', 'close', 'copy')).toBe('done');
    expect(nextPhase('done', 'copy', 'copy')).toBe('done');
    expect(nextPhase('done', 'arrive', 'arrival')).toBe('done');
    expect(nextPhase('done', 'reopen', 'copy')).toBe('open');
    expect(nextPhase('idle', 'reopen', 'copy')).toBe('idle');
    expect(nextPhase('waiting', 'close', 'copy')).toBe('waiting');
  });

  it('starts done when already seen', () => {
    expect(initialPhase(true)).toBe('done');
  });
});

describe('storage', () => {
  it('reads and writes the seen flag', () => {
    const map = new Map<string, string>();
    const storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); } };
    expect(readInviteSeen(storage)).toBe(false);
    markInviteSeen(storage);
    expect(map.get(VOTE_INVITE_KEY)).toBe('seen');
    expect(readInviteSeen(storage)).toBe(true);
  });

  it('survives a storage that throws', () => {
    const broken = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
    expect(readInviteSeen(broken)).toBe(false);
    expect(() => markInviteSeen(broken)).not.toThrow();
    expect(readInviteSeen(undefined)).toBe(false);
  });
});
