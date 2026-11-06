import { describe, expect, it } from 'vitest';
import { calendarDay, parisDate } from './paris-date';

describe('parisDate', () => {
  it('shows the Paris hour, not the server UTC hour', () => {
    expect(parisDate('2026-11-06T07:11:00Z', { hour: '2-digit', minute: '2-digit' })).toBe('08:11');
  });

  it('follows summer time', () => {
    expect(parisDate('2026-07-01T07:11:00Z', { hour: '2-digit', minute: '2-digit' })).toBe('09:11');
  });

  it('moves to the next day after 23:00 UTC in winter', () => {
    expect(parisDate('2026-11-06T23:30:00Z', { day: 'numeric', month: 'short' })).toBe('7 nov.');
  });

  it('accepts a Date and keeps the caller options', () => {
    expect(parisDate(new Date('2026-11-06T12:00:00Z'), { day: '2-digit', month: '2-digit', year: 'numeric' })).toBe('06/11/2026');
  });

  it('ignores a time zone passed by the caller', () => {
    expect(parisDate('2026-11-06T23:30:00Z', { day: 'numeric', timeZone: 'UTC' })).toBe('7');
  });
});

describe('calendarDay', () => {
  it('shows a stored day as is', () => {
    expect(calendarDay('2026-11-20', { day: 'numeric', month: 'long', year: 'numeric' })).toBe('20 novembre 2026');
  });
});
