import { describe, expect, it } from 'vitest';
import { matchTools } from './studio-tools';

const tools = [
  { slug: 'notion', name: 'Notion', site: 'notion.so' },
  { slug: 'nordvpn', name: 'NordVPN', site: 'nordvpn.com' },
  { slug: 'canva', name: 'Canva', site: 'canva.com' },
  { slug: 'notion-calendar', name: 'Calendrier Notion', site: 'calendar.notion.so' },
];

describe('autocomplétion de l’outil', () => {
  it('attend 3 caractères', () => {
    expect(matchTools(tools, 'no')).toEqual([]);
  });
  it('propose par nom ou par site, ceux qui commencent pareil d’abord, sans tenir compte des accents ni des majuscules', () => {
    expect(matchTools(tools, 'NOT').map(tool => tool.slug)).toEqual(['notion', 'notion-calendar']);
    expect(matchTools(tools, 'canva.com').map(tool => tool.slug)).toEqual(['canva']);
    expect(matchTools(tools, 'calendrièr').map(tool => tool.slug)).toEqual(['notion-calendar']);
    expect(matchTools(tools, 'zzz')).toEqual([]);
  });
});
