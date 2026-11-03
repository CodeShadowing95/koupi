import { describe, expect, it } from 'vitest';
import { searchCodes, searchTools, type Code, type Tool } from './data';

const tool = (slug: string, name: string, category: string): Tool => ({ slug, name, category, website: `https://${slug}.com`, description: '', priority: 1, codes: 1 });
const tools = [tool('nordvpn', 'NordVPN', 'VPN et sécurité'), tool('surfshark', 'Surfshark', 'VPN et sécurité'), tool('qonto', 'Qonto', 'Finance et freelance')];

const code = (id: string, toolName: string, creator: string, extra: Partial<Code> = {}): Code => ({
  id, tool: toolName, toolSlug: toolName.toLowerCase(), creator, creatorSlug: creator.toLowerCase().replace(/\s/g, '-'), code: `${id.toUpperCase()}10`,
  discount: '-10 %', status: 'verified', source: '', sourceTitle: '', votes: 0, success: 0,
  lastTestedAt: null, paymentTestedAt: null, expiresOn: null, createdAt: '2026-11-01', ...extra,
});

describe('searchTools', () => {
  it('trouve un outil par son nom, sans accents ni espaces', () => {
    expect(searchTools(tools, 'nord vpn').map(t => t.slug)).toEqual(['nordvpn']);
  });
  it('trouve aussi les outils de la catégorie, après ceux dont le nom correspond', () => {
    expect(searchTools(tools, 'vpn').map(t => t.slug)).toEqual(['nordvpn', 'surfshark']);
    expect(searchTools(tools, 'securite').map(t => t.slug)).toEqual(['nordvpn', 'surfshark']);
  });
});

describe('searchCodes', () => {
  const codes = [
    code('a', 'Surfshark', 'Tutorial Stack', { success: 70, votes: 10 }),
    code('b', 'NordVPN', 'Tutorial Stack', { success: 90, votes: 5 }),
    code('c', 'Qonto', 'Silicon Carne'),
    code('d', 'NordVPN', 'Autre', { status: 'pending' }),
  ];
  it('rien pour une recherche vide', () => {
    expect(searchCodes(codes, tools, '  ')).toEqual([]);
  });
  it('ne montre que les codes publics', () => {
    expect(searchCodes(codes, tools, 'nordvpn').map(c => c.id)).toEqual(['b']);
  });
  it("cherche par outil, créateur, code et catégorie, le nom de l'outil d'abord", () => {
    expect(searchCodes(codes, tools, 'vpn').map(c => c.id)).toEqual(['b', 'a']);
    expect(searchCodes(codes, tools, 'tutorialstack').map(c => c.id)).toEqual(['b', 'a']);
    expect(searchCodes(codes, tools, 'C10').map(c => c.id)).toEqual(['c']);
    expect(searchCodes(codes, tools, 'finance').map(c => c.id)).toEqual(['c']);
  });
});
