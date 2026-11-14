import { describe, expect, it } from 'vitest';
import type { Code, Tool } from './data';
import {
  categoryChips, closeIntro, totalVotes, workedVotes, readCardView, saveCardView, shortName, DEFAULT_EXPLORE, exploreCodes, exploreFilters, exploreTitle, exploreToParams, familyEntries, parseExplore, readIntroClosed, topCreators,
} from './explore';

const NOW = Date.parse('2026-11-06T12:00:00Z');
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

const tool = (slug: string, category: string, family?: string): Tool => ({ slug, name: slug, category, website: '', description: '', priority: 1, codes: 1, family });
const code = (id: string, over: Partial<Code> = {}): Code => ({
  id, tool: 'nord', toolSlug: 'nord', creator: 'Léa', creatorSlug: 'lea', code: id.toUpperCase(), discount: '-10 %', status: 'verified',
  source: '', sourceTitle: '', votes: 10, success: 50, lastTestedAt: null, paymentTestedAt: null, expiresOn: null, createdAt: iso(30), ...over,
});
const tools = [tool('nord', 'VPN', 'securite'), tool('canva', 'Graphisme', 'design'), tool('figma', 'Graphisme', 'design')];
const families = [{ slug: 'securite', name: 'Sécurité' }, { slug: 'video', name: 'Vidéo' }, { slug: 'design', name: 'Design' }];
const categories = [{ slug: 'vpn', name: 'VPN', family: 'securite' }, { slug: 'graphisme', name: 'Graphisme', family: 'design' }, { slug: 'montage', name: 'Montage', family: 'video' }];
const ids = (list: Code[]) => list.map(c => c.id);

describe('exploreCodes', () => {
  const codes = [
    code('a', { success: 90 }),
    code('b', { toolSlug: 'canva', tool: 'Canva', createdAt: iso(1), votes: 0, success: 0 }),
    code('c', { toolSlug: 'figma', tool: 'Figma', creatorSlug: 'max', creator: 'Max', votes: 40, success: 60, paymentTestedAt: iso(3) }),
  ];

  it('montre tout, les plus fiables d’abord', () => {
    expect(ids(exploreCodes(codes, tools, DEFAULT_EXPLORE, NOW))).toEqual(['a', 'c', 'b']);
  });
  it('filtre par rayon', () => {
    expect(ids(exploreCodes(codes, tools, { ...DEFAULT_EXPLORE, shelf: 'fresh' }, NOW))).toEqual(['b']);
    expect(ids(exploreCodes(codes, tools, { ...DEFAULT_EXPLORE, shelf: 'payment' }, NOW))).toEqual(['c']);
  });
  it('« Les plus votés » range par votes et laisse de côté les codes sans vote', () => {
    expect(ids(exploreCodes(codes, tools, { ...DEFAULT_EXPLORE, shelf: 'votes' }, NOW))).toEqual(['c', 'a']);
  });
  it('cumule famille, catégorie, créateur et recherche', () => {
    expect(ids(exploreCodes(codes, tools, { ...DEFAULT_EXPLORE, family: 'design' }, NOW))).toEqual(['c', 'b']);
    expect(ids(exploreCodes(codes, tools, { ...DEFAULT_EXPLORE, family: 'design', creator: 'max' }, NOW))).toEqual(['c']);
    expect(ids(exploreCodes(codes, tools, { ...DEFAULT_EXPLORE, query: 'canva' }, NOW))).toEqual(['b']);
  });
  it('donne aux filtres de la page Codes le tri du rayon', () => {
    expect(exploreFilters({ ...DEFAULT_EXPLORE, shelf: 'fresh' })).toMatchObject({ fresh: true, sort: 'recent' });
    expect(exploreFilters({ ...DEFAULT_EXPLORE, shelf: 'soon' })).toMatchObject({ deadline: 'soon', sort: 'best' });
  });
});

describe('colonne et pastilles', () => {
  const codes = [code('a'), code('b', { toolSlug: 'canva' }), code('c', { toolSlug: 'figma', creatorSlug: 'max', creator: 'Max' }), code('d', { toolSlug: 'figma', creatorSlug: 'max', creator: 'Max' })];

  it('garde les familles qui ont des codes, dans l’ordre du menu', () => {
    expect(familyEntries(codes, tools, families)).toEqual([{ slug: 'securite', name: 'Sécurité', count: 1 }, { slug: 'design', name: 'Design', count: 3 }]);
  });
  it('donne les catégories de la famille choisie, les plus fournies d’abord', () => {
    expect(categoryChips(codes, tools, categories, '')).toEqual([{ slug: 'graphisme', name: 'Graphisme', count: 3 }, { slug: 'vpn', name: 'VPN', count: 1 }]);
    expect(categoryChips(codes, tools, categories, 'securite')).toEqual([{ slug: 'vpn', name: 'VPN', count: 1 }]);
  });
  it('raccourcit le nom d’une famille à son premier mot', () => {
    expect(shortName('Hébergement, domaines et cloud')).toBe('Hébergement');
    expect(shortName('Vidéo')).toBe('Vidéo');
  });
  it('met en tête les créateurs qui donnent le plus de codes', () => {
    expect(topCreators(codes, 1)).toEqual([{ slug: 'lea', name: 'Léa', count: 2, level: undefined }]);
    expect(topCreators(codes).map(c => c.slug)).toEqual(['lea', 'max']);
  });
});

describe('adresse', () => {
  it('lit et réécrit l’état, sans les valeurs par défaut', () => {
    const state = parseExplore({ shelf: 'fresh', family: 'video', category: 'montage', creator: 'ana', q: 'vpn' });
    expect(state).toEqual({ shelf: 'fresh', family: 'video', category: 'montage', creator: 'ana', query: 'vpn' });
    expect(exploreToParams(state).toString()).toBe('shelf=fresh&family=video&category=montage&creator=ana&q=vpn');
    expect(exploreToParams(DEFAULT_EXPLORE).toString()).toBe('');
  });
  it('ramène un rayon inconnu à « Tout » et coupe les valeurs trop longues', () => {
    expect(parseExplore({ shelf: 'hack', q: ['a', 'b'] })).toEqual(DEFAULT_EXPLORE);
    expect(parseExplore({ q: 'x'.repeat(200) }).query).toHaveLength(80);
  });
});

describe('exploreTitle', () => {
  const names = { family: () => 'Design', creator: () => 'Max' };
  it('nomme ce qu’on regarde, la recherche d’abord', () => {
    expect(exploreTitle(DEFAULT_EXPLORE, names)).toBe('Tout le comptoir');
    expect(exploreTitle({ ...DEFAULT_EXPLORE, shelf: 'payment' }, names)).toBe('Testés au paiement');
    expect(exploreTitle({ ...DEFAULT_EXPLORE, family: 'design' }, names)).toBe('Design');
    expect(exploreTitle({ ...DEFAULT_EXPLORE, family: 'design', category: 'Graphisme' }, names)).toBe('Graphisme');
    expect(exploreTitle({ ...DEFAULT_EXPLORE, creator: 'max' }, names)).toBe('Donnés par Max');
    expect(exploreTitle({ ...DEFAULT_EXPLORE, creator: 'max', query: 'vpn' }, names)).toBe('Résultats pour « vpn »');
  });
});

describe('message d’accueil', () => {
  it('reste affiché tant qu’il n’a pas été fermé, même sans stockage', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
    expect(readIntroClosed(storage)).toBe(false);
    closeIntro(storage);
    expect(readIntroClosed(storage)).toBe(true);
    expect(readIntroClosed(undefined)).toBe(false);
    const broken = { getItem: () => { throw new Error('bloqué'); }, setItem: () => { throw new Error('bloqué'); } };
    expect(readIntroClosed(broken)).toBe(false);
    expect(() => closeIntro(broken)).not.toThrow();
  });
});

describe('vue des cartes', () => {
  it('garde le choix, détaillées par défaut ou sans stockage', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
    expect(readCardView(storage)).toBe('detailed');
    saveCardView(storage, 'simple');
    expect(readCardView(storage)).toBe('simple');
    saveCardView(storage, 'detailed');
    expect(readCardView(storage)).toBe('detailed');
    const broken = { getItem: () => { throw new Error('bloqué'); }, setItem: () => { throw new Error('bloqué'); } };
    expect(readCardView(broken)).toBe('detailed');
    expect(() => saveCardView(broken, 'simple')).not.toThrow();
  });
});

describe('bandeau de vote', () => {
  it('additionne les votes des codes affichés', () => {
    expect(totalVotes([{ votes: 10 }, { votes: 0 }, { votes: 32 }])).toBe(42);
    expect(totalVotes([])).toBe(0);
  });

  it('ne compte que les votes « ça marche » pour la page créateur', () => {
    // 17 pouces en haut sur 18 votes (94 %) : la case affiche 17, comme le pouce du coupon.
    expect(workedVotes([{ votes: 18, success: 94 }, { votes: 0, success: 0 }])).toBe(17);
    expect(workedVotes([{ votes: 4, success: 50 }, { votes: 3, success: 100 }])).toBe(5);
    expect(workedVotes([])).toBe(0);
  });
});
