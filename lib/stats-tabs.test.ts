import { describe, expect, it } from 'vitest';
import { parseStatsTab, statsTabHref } from './stats-tabs';

describe('onglets des statistiques', () => {
  it('ouvre le premier onglet par défaut ou pour une valeur inconnue', () => {
    expect(parseStatsTab(undefined)).toBe('catalogue');
    expect(parseStatsTab('nimporte')).toBe('catalogue');
  });
  it('lit l’onglet demandé, même répété', () => {
    expect(parseStatsTab('sources')).toBe('sources');
    expect(parseStatsTab(['consommation', 'sources'])).toBe('consommation');
  });
  it('garde l’adresse nue pour le premier onglet', () => {
    expect(statsTabHref('catalogue')).toBe('/admin/stats');
    expect(statsTabHref('consommation')).toBe('/admin/stats?tab=consommation');
  });
});
