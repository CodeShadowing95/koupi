import { describe, expect, it } from 'vitest';
import type { Code } from './data';
import { buildNotifications, parseSeen, timeAgo, unseen } from './admin-notifications';

const now = new Date('2026-11-02T12:00:00.000Z');
const code = (over: Partial<Code>): Code => ({
  id: 'c1', tool: 'Notion', toolSlug: 'notion', creator: 'Ali', creatorSlug: 'ali', code: 'NOTION20', discount: '-20 %', status: 'verified',
  source: 'https://x.y', sourceTitle: '', votes: 0, success: 0, lastTestedAt: '2026-11-01T00:00:00.000Z', createdAt: '2026-10-01T00:00:00.000Z', ...over,
});
const proposal = (id: string, createdAt: string) => ({ id, code: `P${id}`, toolName: 'Canva', creatorName: 'Bea', createdAt });

describe('buildNotifications', () => {
  it('lists new proposals first, newest first, then flagged codes and reminders', () => {
    const items = buildNotifications({
      proposals: [proposal('1', '2026-11-01T10:00:00.000Z'), proposal('2', '2026-11-02T09:00:00.000Z')],
      codes: [
        code({ id: 'f', code: 'DEAD', votes: 4, success: 25 }),
        code({ id: 's', lastTestedAt: null }),
        code({ id: 't', status: 'to_test' }), code({ id: 't2', status: 'to_test' }), code({ id: 'a', status: 'to_test', archived: true }),
      ],
    }, now);
    expect(items.map(item => item.id)).toEqual(['proposal-2', 'proposal-1', 'flag-f-4', 'retest-1', 'to-test-2']);
    expect(items[0]).toMatchObject({ title: 'Nouvelle proposition : P2', detail: 'Canva · par Bea', href: '/admin/propositions?q=P2', at: '2026-11-02T09:00:00.000Z' });
    expect(items[2]).toMatchObject({ tone: 'bad', title: 'DEAD signalé par les visiteurs', detail: 'Notion · 4 votes, 25 % de réussite', at: null });
    expect(items[3].title).toBe('1 code à retester');
    expect(items[4]).toMatchObject({ title: '2 codes à tester', href: '/admin/codes?status=to_test' });
  });
  it('is empty when everything is done', () => {
    expect(buildNotifications({ proposals: [], codes: [code({})] }, now)).toEqual([]);
  });
  it('keeps at most ten proposals', () => {
    const proposals = Array.from({ length: 12 }, (_, i) => proposal(String(i), `2026-11-01T${String(i).padStart(2, '0')}:00:00.000Z`));
    expect(buildNotifications({ proposals, codes: [] }, now)).toHaveLength(10);
  });
});

describe('seen notifications', () => {
  it('only counts what has not been seen, and a changed reminder comes back', () => {
    const items = buildNotifications({ proposals: [proposal('1', '2026-11-02T09:00:00.000Z')], codes: [code({ status: 'to_test' })] }, now);
    expect(unseen(items, ['proposal-1']).map(item => item.id)).toEqual(['to-test-1']);
    expect(unseen(items, ['proposal-1', 'to-test-3'])).toHaveLength(1);
  });
  it('reads stored ids safely', () => {
    expect(parseSeen(null)).toEqual([]);
    expect(parseSeen('{')).toEqual([]);
    expect(parseSeen('["a",1,"b"]')).toEqual(['a', 'b']);
  });
});

describe('timeAgo', () => {
  it('speaks like a person', () => {
    expect(timeAgo('2026-11-02T11:59:40.000Z', now)).toBe('à l’instant');
    expect(timeAgo('2026-11-02T11:55:00.000Z', now)).toBe('il y a 5 min');
    expect(timeAgo('2026-11-02T09:00:00.000Z', now)).toBe('il y a 3 h');
    expect(timeAgo('2026-11-01T10:00:00.000Z', now)).toBe('hier');
    expect(timeAgo('2026-10-29T10:00:00.000Z', now)).toBe('il y a 4 j');
  });
});
