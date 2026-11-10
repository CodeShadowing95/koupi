import { describe, expect, it } from 'vitest';
import { bannerPicks, currentSeason, daysUntil, seasonDismissKey } from './season-banner';

const at = (iso: string) => new Date(iso);

describe('currentSeason', () => {
  it('montre le Black Friday du 1er novembre au Cyber Monday, avec le nombre de jours restants', () => {
    expect(currentSeason(at('2026-10-31T12:00:00Z'))).toBeNull();
    expect(currentSeason(at('2026-11-09T12:00:00Z'))).toEqual({ kind: 'black-friday', year: 2026, daysLeft: 18 });
    expect(currentSeason(at('2026-11-27T12:00:00Z'))).toEqual({ kind: 'black-friday', year: 2026, daysLeft: 0 });
    expect(currentSeason(at('2026-11-30T20:00:00Z'))).toMatchObject({ kind: 'black-friday', daysLeft: 0 });
  });

  it('passe à Noël après le Cyber Monday, jusqu’au 25 décembre', () => {
    expect(currentSeason(at('2026-12-01T08:00:00Z'))).toEqual({ kind: 'christmas', year: 2026, daysLeft: 24 });
    expect(currentSeason(at('2026-12-25T20:00:00Z'))).toEqual({ kind: 'christmas', year: 2026, daysLeft: 0 });
  });

  it('passe aux soldes d’hiver le lendemain de Noël, jusqu’à leur dernier jour', () => {
    expect(currentSeason(at('2026-12-26T08:00:00Z'))).toEqual({ kind: 'sales', year: 2027, daysLeft: 11 });
    expect(currentSeason(at('2027-01-06T08:00:00Z'))).toEqual({ kind: 'sales', year: 2027, daysLeft: 0 });
    expect(currentSeason(at('2027-02-02T20:00:00Z'))).toMatchObject({ kind: 'sales', daysLeft: 0 });
    expect(currentSeason(at('2027-02-03T08:00:00Z'))).toBeNull();
  });

  it('se ferme par saison et par année', () => {
    expect(seasonDismissKey({ kind: 'christmas', year: 2026, daysLeft: 3 })).toBe('merkod-season-christmas-2026');
  });
});

describe('bannerPicks', () => {
  const code = (toolSlug: string, success: number, discount = '-10 %', family = 'f') => ({ toolSlug, tool: toolSlug.toUpperCase(), success, discount, family });
  it('garde les outils les plus fiables, un code par outil, en variant les familles', () => {
    const picks = bannerPicks([code('a', 90, '-20 %', 'vpn'), code('a', 95, '-30 %', 'vpn'), code('b', 80, '-10 %', 'vpn'), code('c', 70, '1 mois offert', 'ia'), code('d', 60, '-15 %', 'video')], 3);
    expect(picks).toEqual([
      { toolSlug: 'a', tool: 'A', discount: '-30 %' },
      { toolSlug: 'c', tool: 'C', discount: '1 mois offert' },
      { toolSlug: 'd', tool: 'D', discount: '-15 %' },
    ]);
  });

  it('fait passer devant une réduction chiffrée et courte', () => {
    expect(bannerPicks([code('a', 99, 'Offre partenaire', 'x'), code('b', 10, '-20 %', 'y')], 1)[0].toolSlug).toBe('b');
  });

  it('coupe une réduction trop longue', () => {
    expect(bannerPicks([code('a', 1, '20 % de réduction sur ton premier abonnement annuel')], 1)[0].discount).toBe('20 % de réduction…');
  });
});

describe('daysUntil', () => {
  it('compte les jours entiers jusqu’à la date, 0 ensuite', () => {
    expect(daysUntil(new Date('2026-11-27T00:00:00Z'), new Date('2026-11-09T22:00:00Z'))).toBe(18);
    expect(daysUntil(new Date('2026-11-27T00:00:00Z'), new Date('2026-12-01T10:00:00Z'))).toBe(0);
  });
});
