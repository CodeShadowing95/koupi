import { describe, expect, it } from 'vitest';
import { countByInitial, filterByInitial, initialOf, sortItems } from './admin-sort';

describe('initialOf', () => {
  it('returns the letter without accent', () => {
    expect(initialOf('nordVPN')).toBe('N');
    expect(initialOf('Élodie')).toBe('E');
    expect(initialOf('  çava')).toBe('C');
    expect(initialOf('Œuvre')).toBe('O');
  });
  it('groups digits and symbols', () => {
    expect(initialOf('2MinutesPapers')).toBe('0-9');
    expect(initialOf('@koupi')).toBe('#');
    expect(initialOf('_dev')).toBe('#');
    expect(initialOf('🎬 Studio')).toBe('#');
  });
  it('treats empty values as symbols', () => {
    expect(initialOf('')).toBe('#');
    expect(initialOf(null)).toBe('#');
  });
});

describe('sortItems', () => {
  const names = ['b', 'Élan', 'a', 'item 10', 'item 2'];
  it('sorts text ignoring case and accents, numbers inside text naturally', () => {
    expect(sortItems(names, name => name, 'asc')).toEqual(['a', 'b', 'Élan', 'item 2', 'item 10']);
    expect(sortItems(names, name => name, 'desc')).toEqual(['item 10', 'item 2', 'Élan', 'b', 'a']);
  });
  it('sorts numbers', () => {
    expect(sortItems([3, 10, 1], value => value, 'asc')).toEqual([1, 3, 10]);
    expect(sortItems([3, 10, 1], value => value, 'desc')).toEqual([10, 3, 1]);
  });
  it('sorts ISO dates as text', () => {
    const dates = ['2026-10-01T10:00:00Z', '2026-11-01T09:00:00Z', '2026-09-15T00:00:00Z'];
    expect(sortItems(dates, date => date, 'desc')[0]).toBe('2026-11-01T09:00:00Z');
  });
  it('keeps empty values last in both directions', () => {
    const rows = [{ v: null }, { v: 2 }, { v: 1 }];
    expect(sortItems(rows, row => row.v, 'asc').map(row => row.v)).toEqual([1, 2, null]);
    expect(sortItems(rows, row => row.v, 'desc').map(row => row.v)).toEqual([2, 1, null]);
  });
  it('keeps the original order on ties and does not mutate', () => {
    const rows = [{ n: 'x', id: 1 }, { n: 'X', id: 2 }];
    expect(sortItems(rows, row => row.n, 'desc').map(row => row.id)).toEqual([1, 2]);
    expect(rows[0].id).toBe(1);
  });
});

describe('initial filter', () => {
  const names = ['Apple', 'avast', '2Min', 'Bolt', '@me'];
  it('counts by initial', () => {
    const counts = countByInitial(names, name => name);
    expect(counts.get('A')).toBe(2);
    expect(counts.get('0-9')).toBe(1);
    expect(counts.get('#')).toBe(1);
    expect(counts.get('Z')).toBeUndefined();
  });
  it('filters by initial, or keeps all with no letter', () => {
    expect(filterByInitial(names, name => name, 'A')).toEqual(['Apple', 'avast']);
    expect(filterByInitial(names, name => name, '')).toHaveLength(5);
  });
});
