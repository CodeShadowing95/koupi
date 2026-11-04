import { describe, expect, it } from 'vitest';
import type { Code, Tool } from './data';
import {
  activeFilters, compactCount, lastChanceCodes, relaxSuggestions, DEFAULT_FILTERS, facetCounts, featuredCodes, filterCodes, filtersToParams, offerKinds, parseFilters,
} from './codes-board';

const NOW = Date.parse('2026-11-03T12:00:00Z');
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const day = (daysAhead: number) => new Date(NOW + daysAhead * DAY).toISOString().slice(0, 10);

const tool = (slug: string, category: string): Tool => ({ slug, name: slug, category, website: '', description: '', priority: 1, codes: 1 });
const code = (id: string, over: Partial<Code> = {}): Code => ({
  id, tool: 'nord', toolSlug: 'nord', creator: 'Léa', creatorSlug: 'lea', code: id.toUpperCase(), discount: '-10 %', status: 'verified',
  source: '', sourceTitle: '', votes: 10, success: 50, lastTestedAt: null, paymentTestedAt: null, expiresOn: null, createdAt: '2026-11-01', ...over,
});
const tools = [tool('nord', 'VPN'), tool('canva', 'Design')];
const run = (codes: Code[], patch: Partial<typeof DEFAULT_FILTERS>) => filterCodes(codes, tools, { ...DEFAULT_FILTERS, ...patch }, NOW).map(c => c.id);

describe('featuredCodes', () => {
  it('met les vérifiés en premier, puis complète avec les codes à tester', () => {
    const codes = [code('a', { status: 'to_test', success: 99 }), code('b', { success: 60 }), code('c', { success: 80 })];
    expect(featuredCodes(codes, 3).map(c => c.id)).toEqual(['c', 'b', 'a']);
  });
  it('respecte la limite', () => {
    expect(featuredCodes([code('a'), code('b'), code('c')], 2)).toHaveLength(2);
  });
});

describe('offerKinds', () => {
  it('reconnaît le pourcentage, les mois offerts, l\'essai et le montant', () => {
    expect(offerKinds('-25 %')).toEqual(['percent']);
    expect(offerKinds('88 % + 4 mois offerts')).toEqual(['percent', 'months']);
    expect(offerKinds('1 mois gratuit')).toEqual(['months']);
    expect(offerKinds('Essai gratuit de 14 jours')).toEqual(['trial']);
    expect(offerKinds('10 € offerts')).toEqual(['amount']);
    expect(offerKinds('$20 off')).toEqual(['amount']);
  });
  it('range le reste dans « autre »', () => {
    expect(offerKinds('Offre partenaire')).toEqual(['other']);
  });
});

describe('filterCodes', () => {
  const codes = [
    code('a', { success: 90, votes: 5, createdAt: '2026-10-01' }),
    code('b', { tool: 'Canva', toolSlug: 'canva', creator: 'Max', creatorSlug: 'max', success: 70, votes: 40, status: 'to_test', createdAt: '2026-11-02' }),
  ];
  it('cherche dans l\'outil, le créateur et le code, sans accents ni casse', () => {
    expect(run(codes, { query: 'lea' })).toEqual(['a']);
    expect(run(codes, { query: 'canva' })).toEqual(['b']);
    expect(run(codes, { query: 'B' })).toEqual(['b']);
  });
  it('filtre par catégorie et par statut', () => {
    expect(run(codes, { category: 'VPN' })).toEqual(['a']);
    expect(run(codes, { status: 'to_test' })).toEqual(['b']);
  });
  it('filtre par outil et par créateur', () => {
    expect(run(codes, { tool: 'canva' })).toEqual(['b']);
    expect(run(codes, { creator: 'lea' })).toEqual(['a']);
  });
  it('trie par réussite, par votes ou par date', () => {
    expect(run(codes, {})).toEqual(['a', 'b']);
    expect(run(codes, { sort: 'votes' })).toEqual(['b', 'a']);
    expect(run(codes, { sort: 'recent' })).toEqual(['b', 'a']);
  });
  it('garde les codes qui remplissent tous les critères de confiance cochés', () => {
    const list = [
      code('paid', { paymentTestedAt: iso(60), lastTestedAt: iso(60), success: 85 }),
      code('fresh', { lastTestedAt: iso(3), success: 60 }),
      code('old', { lastTestedAt: iso(45), success: 95 }),
      code('unverified', { status: 'to_test', paymentTestedAt: iso(1), success: 10 }),
    ];
    expect(run(list, { trust: ['payment'] })).toEqual(['paid']);
    expect(run(list, { trust: ['recent'] })).toEqual(['fresh']);
    expect(run(list, { trust: ['reliable'] })).toEqual(['old', 'paid']);
    expect(run(list, { trust: ['reliable', 'payment'] })).toEqual(['paid']);
  });
  it('filtre par type d\'offre', () => {
    const list = [code('pct', { discount: '-20 %' }), code('mois', { discount: '3 mois offerts' }), code('mix', { discount: '60 % + 2 mois offerts' })];
    expect(run(list, { offer: 'months' })).toEqual(['mois', 'mix']);
    expect(run(list, { offer: 'percent' })).toEqual(['pct', 'mix']);
  });
  it('filtre par échéance : bientôt (7 jours) ou sans date de fin', () => {
    const list = [code('soon', { expiresOn: day(3) }), code('later', { expiresOn: day(30) }), code('none'), code('past', { expiresOn: day(-2) })];
    expect(run(list, { deadline: 'soon' })).toEqual(['soon']);
    expect(run(list, { deadline: 'none' })).toEqual(['none']);
  });
  it('ne garde que les codes ajoutés ces 7 derniers jours', () => {
    const list = [code('new', { createdAt: iso(2) }), code('old', { createdAt: iso(20) })];
    expect(run(list, { fresh: true })).toEqual(['new']);
  });
});

describe('facetCounts', () => {
  it('compte chaque option en tenant compte des autres filtres, mais pas du sien', () => {
    const codes = [
      code('a', { status: 'verified', discount: '-10 %', paymentTestedAt: iso(1) }),
      code('b', { status: 'to_test', discount: '2 mois offerts' }),
      code('c', { status: 'to_test', discount: '-5 %', toolSlug: 'canva', tool: 'Canva' }),
    ];
    const counts = facetCounts(codes, tools, { ...DEFAULT_FILTERS, status: 'to_test', offer: 'percent' }, NOW);
    expect(counts.status).toEqual({ all: 2, verified: 1, to_test: 1 });
    expect(counts.offer.percent).toBe(1);
    expect(counts.offer.months).toBe(1);
    expect(counts.tool).toEqual({ canva: 1 });
    expect(counts.trust.payment).toBe(0);
  });
});

describe('parseFilters et filtersToParams', () => {
  it('garde les valeurs connues et ignore le reste', () => {
    expect(parseFilters({ q: 'nord', category: 'VPN', status: 'to_test', sort: 'votes' }))
      .toEqual({ ...DEFAULT_FILTERS, query: 'nord', category: 'VPN', status: 'to_test', sort: 'votes' });
    expect(parseFilters({ status: 'pending', sort: 'x', q: ['a', 'b'], trust: 'x,payment,payment', offer: 'free', deadline: 'never', fresh: 'oui' }))
      .toEqual({ ...DEFAULT_FILTERS, trust: ['payment'] });
  });
  it('fait l\'aller-retour avec l\'adresse', () => {
    const filters = { ...DEFAULT_FILTERS, tool: 'nord', creator: 'lea', trust: ['recent', 'payment'] as const, offer: 'trial' as const, deadline: 'soon' as const, fresh: true };
    const params = filtersToParams({ ...filters, trust: [...filters.trust] });
    expect(params.toString()).toBe('tool=nord&creator=lea&trust=recent%2Cpayment&offer=trial&deadline=soon&fresh=1');
    expect(parseFilters(Object.fromEntries(params))).toEqual({ ...filters, trust: ['recent', 'payment'] });
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('');
  });
});

describe('activeFilters', () => {
  it('liste chaque filtre actif avec ce qu\'il faut changer pour le retirer', () => {
    const pills = activeFilters({ ...DEFAULT_FILTERS, query: 'nord', trust: ['payment', 'recent'], fresh: true }, { tool: () => '', creator: () => '' });
    expect(pills.map(pill => pill.label)).toEqual(['« nord »', 'Testé au paiement', 'Vérifié ces 30 jours', 'Ajoutés cette semaine']);
    expect(pills[1].patch).toEqual({ trust: ['recent'] });
    expect(pills[3].patch).toEqual({ fresh: false });
  });
  it('affiche le nom de l\'outil et du créateur', () => {
    const pills = activeFilters({ ...DEFAULT_FILTERS, tool: 'nord', creator: 'lea' }, { tool: slug => `Outil ${slug}`, creator: slug => `Créa ${slug}` });
    expect(pills.map(pill => pill.label)).toEqual(['Outil nord', 'Créa lea']);
  });
});

describe('lastChanceCodes', () => {
  it('garde les codes qui expirent sous 7 jours, les plus pressés d\'abord', () => {
    const list = [code('later', { expiresOn: day(20) }), code('three', { expiresOn: day(3) }), code('none'), code('one', { expiresOn: day(1) }), code('past', { expiresOn: day(-1) })];
    const out = lastChanceCodes(list, NOW);
    expect(out.map(item => item.code.id)).toEqual(['one', 'three']);
    expect(out[0].label).toBe('Expire dans 1 jour');
  });
  it('respecte la limite', () => {
    expect(lastChanceCodes([code('a', { expiresOn: day(2) }), code('b', { expiresOn: day(3) })], NOW, 1)).toHaveLength(1);
  });
});

describe('relaxSuggestions', () => {
  it('propose les filtres à retirer qui redonnent le plus de codes', () => {
    const list = [code('a', { discount: '-10 %' }), code('b', { discount: '-20 %', toolSlug: 'canva' }), code('c', { discount: '2 mois offerts', toolSlug: 'canva' })];
    const filters = { ...DEFAULT_FILTERS, tool: 'nord', offer: 'months' as const, fresh: true };
    const pills = activeFilters(filters, { tool: () => 'Nord', creator: () => '' });
    expect(relaxSuggestions(list, tools, filters, pills, NOW).map(item => [item.key, item.count])).toEqual([['tool', 1], ['offer', 1]]);
    // Codes anciens : retirer un seul filtre ne suffit pas, on ne propose rien.
    const old = list.map(c => ({ ...c, createdAt: iso(30) }));
    expect(relaxSuggestions(old, tools, filters, pills, NOW)).toEqual([]);
  });
});

describe('compactCount', () => {
  it('donne le nombre exact sous 100', () => {
    expect(compactCount(0)).toBe('0');
    expect(compactCount(31)).toBe('31');
    expect(compactCount(99)).toBe('99');
  });
  it('écrit +99 de 100 à 999', () => {
    expect(compactCount(100)).toBe('+99');
    expect(compactCount(999)).toBe('+99');
  });
  it('arrondit aux milliers puis aux millions, vers le bas', () => {
    expect(compactCount(1000)).toBe('+1K');
    expect(compactCount(2999)).toBe('+2K');
    expect(compactCount(999_999)).toBe('+999K');
    expect(compactCount(1_000_000)).toBe('+1M');
    expect(compactCount(2_500_000)).toBe('+2M');
  });
});

describe('famille de catégories', () => {
  const famTools: Tool[] = [{ ...tool('nord', 'VPN'), family: 'securite' }, { ...tool('canva', 'Design'), family: 'creation' }, tool('loose', 'Autre')];
  const codes = [code('a'), code('b', { tool: 'canva', toolSlug: 'canva' }), code('c', { tool: 'loose', toolSlug: 'loose' })];
  const filters = (patch: Partial<typeof DEFAULT_FILTERS>) => ({ ...DEFAULT_FILTERS, ...patch });

  it('ne garde que les codes des outils de la famille', () => {
    expect(filterCodes(codes, famTools, filters({ family: 'securite' }), NOW).map(c => c.id)).toEqual(['a']);
  });

  it('compte les codes par famille sans tenir compte de la famille choisie', () => {
    expect(facetCounts(codes, famTools, filters({ family: 'securite' }), NOW).family).toEqual({ securite: 1, creation: 1 });
  });

  it('compte tous les codes pour la pastille « Tous », rangés ou non', () => {
    expect(facetCounts(codes, famTools, filters({ family: 'securite', category: 'VPN' }), NOW).allFamilies).toBe(3);
  });

  it('compte les catégories à l’intérieur de la famille choisie', () => {
    expect(facetCounts(codes, famTools, filters({ family: 'creation' }), NOW).category).toEqual({ Design: 1 });
  });

  it('passe par l’adresse', () => {
    const parsed = parseFilters({ family: 'securite', category: 'VPN' });
    expect(parsed.family).toBe('securite');
    expect(filtersToParams(parsed).toString()).toBe('family=securite&category=VPN');
  });

  it('retirer la famille retire aussi sa catégorie', () => {
    const pill = activeFilters(filters({ family: 'securite', category: 'VPN' }), { tool: () => '', creator: () => '', family: () => 'Sécurité' })
      .find(p => p.key === 'family');
    expect(pill).toEqual({ key: 'family', label: 'Sécurité', patch: { family: '', category: '' } });
  });
});
