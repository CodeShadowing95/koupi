import { describe, expect, it } from 'vitest';
import { catalogMatch } from './verification-display';

const tools = [{ slug: 'nordvpn', name: 'NordVPN' }, { slug: 'nordpass', name: 'NordPass' }, { slug: 'rankerfox', name: 'Rankerfox' }, { slug: 'envato', name: 'Envato Elements' }];

describe('catalogMatch', () => {
  it('finds the catalogue tool the AI names, exactly or inside a longer name', () => {
    expect(catalogMatch(tools, 'Rankerfox', 'envato')).toBe('rankerfox');
    expect(catalogMatch(tools, 'NordVPN Plus', 'envato')).toBe('nordvpn');
    expect(catalogMatch(tools, 'Envato', 'nordvpn')).toBe('envato');
  });

  it('never proposes the current tool, and returns nothing for an unknown brand', () => {
    expect(catalogMatch(tools, 'Rankerfox', 'rankerfox')).toBe('');
    expect(catalogMatch(tools, 'Surfshark', 'nordvpn')).toBe('');
    expect(catalogMatch(tools, '', 'nordvpn')).toBe('');
  });
});
