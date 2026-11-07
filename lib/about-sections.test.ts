import { describe, expect, it } from 'vitest';
import { ABOUT_SECTIONS, activeSection } from './about-sections';

describe('sections de la page Présentation', () => {
  it('donne des ancres uniques, utilisables dans une adresse', () => {
    const ids = ABOUT_SECTIONS.map(section => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });
  it('met en avant la section créateurs, placée avant « Contribuer »', () => {
    const ids = ABOUT_SECTIONS.map(section => section.id);
    expect(ABOUT_SECTIONS.filter(section => 'accent' in section).map(section => section.id)).toEqual(['espace-createurs']);
    expect(ids.indexOf('espace-createurs')).toBe(ids.indexOf('contribuer') - 1);
  });
  it('souligne la dernière section passée sous la ligne de lecture', () => {
    const tops = [{ id: 'a', top: -900 }, { id: 'b', top: 40 }, { id: 'c', top: 700 }];
    expect(activeSection(tops, 120)).toBe('b');
    expect(activeSection(tops, 10)).toBe('a');
    expect(activeSection([{ id: 'a', top: 300 }], 120)).toBeNull();
  });
});
