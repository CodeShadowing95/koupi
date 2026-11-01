import { describe, expect, it } from 'vitest';
import { filterOptions, moveActive, type SelectOption } from './admin-select';

const options: SelectOption[] = [
  { value: 'vpn', label: 'VPN' },
  { value: 'heb', label: 'Hébergement web' },
  { value: 'nord', label: 'NordVPN', hint: 'VPN' },
  { value: '__new__', label: '+ Nouvel outil', pinned: true },
];

describe('filterOptions', () => {
  it('keeps everything when the query is empty', () => {
    expect(filterOptions(options, '  ')).toHaveLength(4);
  });
  it('ignores case and accents', () => {
    expect(filterOptions(options, 'HEBER').map(option => option.value)).toEqual(['heb', '__new__']);
  });
  it('searches the hint too', () => {
    expect(filterOptions(options, 'vpn').map(option => option.value)).toEqual(['vpn', 'nord', '__new__']);
  });
  it('always keeps pinned options', () => {
    expect(filterOptions(options, 'zzz').map(option => option.value)).toEqual(['__new__']);
  });
});

describe('moveActive', () => {
  it('starts at the first or last item', () => {
    expect(moveActive(-1, 1, 3)).toBe(0);
    expect(moveActive(-1, -1, 3)).toBe(2);
  });
  it('wraps around', () => {
    expect(moveActive(2, 1, 3)).toBe(0);
    expect(moveActive(0, -1, 3)).toBe(2);
  });
  it('returns -1 for an empty list', () => {
    expect(moveActive(0, 1, 0)).toBe(-1);
  });
});
