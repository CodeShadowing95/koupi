import { describe, expect, it } from 'vitest';
import { audienceBracket, audienceShort, contactOrder, creatorRatings, creatorSubscribers, isToContact, matchesFilters, NO_FILTERS, type AdminCreatorFacts } from './creator-admin-filter';

const yt = (subscribers: number | null, metrics: object = {}) => ({ platform: 'youtube' as const, subscribers, metrics, claimStatus: 'none' as const });
const pod = (ratingCount: number, language = 'fr') => ({ platform: 'podcast' as const, subscribers: null, metrics: { rating: 4.5, ratingCount, language }, claimStatus: 'none' as const });
const creator = (overrides: Partial<AdminCreatorFacts> = {}): AdminCreatorFacts => ({ name: 'Ana', visible: 1, level: 'spotted', accounts: [], copies: 0, inTouch: false, ...overrides });

describe('audience', () => {
  it('prend le compte le plus suivi et le podcast le plus noté', () => {
    const accounts = [yt(1200), yt(54_000), pod(80), pod(300)];
    expect(creatorSubscribers(accounts)).toBe(54_000);
    expect(creatorRatings(accounts)).toBe(300);
    expect(creatorSubscribers([pod(3)])).toBeNull();
  });
  it('range dans une tranche', () => {
    expect([null, 9_999, 10_000, 999_999, 1_000_000].map(audienceBracket)).toEqual(['none', 'small', 'mid', 'large', 'huge']);
  });
  it('résume l’audience en court', () => {
    expect(audienceShort([yt(12_400)])).toBe('12,4 k abonnés');
    expect(audienceShort([pod(5281)])).toBe('5,3 k notes');
    expect(audienceShort([])).toBeNull();
  });
});

describe('matchesFilters', () => {
  it('filtre par réseau, langue et audience', () => {
    const french = creator({ accounts: [yt(50_000, { language: 'fr' })] });
    const english = creator({ accounts: [pod(10, 'en')] });
    const none = creator();
    expect(matchesFilters(french, NO_FILTERS)).toBe(true);
    expect(matchesFilters(french, { ...NO_FILTERS, platform: 'podcast' })).toBe(false);
    expect(matchesFilters(english, { ...NO_FILTERS, platform: 'podcast', language: 'en' })).toBe(true);
    expect(matchesFilters(none, { ...NO_FILTERS, platform: 'none', language: 'unknown', audience: 'none' })).toBe(true);
    expect(matchesFilters(french, { ...NO_FILTERS, audience: 'mid' })).toBe(true);
    expect(matchesFilters(french, { ...NO_FILTERS, audience: 'large' })).toBe(false);
  });
});

describe('À contacter', () => {
  it('garde ceux qui sont sur le site et ne nous connaissent pas encore', () => {
    expect(isToContact(creator())).toBe(true);
    expect(isToContact(creator({ visible: 0 }))).toBe(false);
    expect(isToContact(creator({ inTouch: true }))).toBe(false);
    expect(isToContact(creator({ accounts: [{ ...yt(10), claimStatus: 'pending' }] }))).toBe(false);
    expect(isToContact(creator({ level: 'verified' }))).toBe(false);
  });
  it('met d’abord les plus copiés, puis la plus grande audience', () => {
    const list = [creator({ name: 'C', accounts: [yt(10)] }), creator({ name: 'B', copies: 4 }), creator({ name: 'A', accounts: [yt(9_000)] })];
    expect(list.sort(contactOrder).map(item => item.name)).toEqual(['B', 'A', 'C']);
  });
});
