import { describe, expect, it } from 'vitest';
import { findLinkInText, isLinkOffer, offerName, shortLink } from './offer-link';

describe('offer-link', () => {
  it('reconnaît une offre sans code', () => {
    expect(isLinkOffer({ code: null })).toBe(true);
    expect(isLinkOffer({ code: '' })).toBe(true);
    expect(isLinkOffer({ code: 'NORD20' })).toBe(false);
  });

  it('nomme l’offre par son code, sinon par son lien', () => {
    expect(offerName('NORD20')).toBe('NORD20');
    expect(offerName(null, 'https://try.krispcall.com/tad/')).toBe('lien try.krispcall.com/tad');
    expect(offerName('', null)).toBe('lien');
    expect(shortLink('HTTPS://www.Site.com/x?')).toBe('site.com/x');
  });

  it('retrouve le lien dans la description, avec ou sans https://', () => {
    const text = '- KrispCall: Agentic Cloud Telephony - https://try.krispcall.com/tad\n- Autre';
    expect(findLinkInText('https://try.krispcall.com/tad', text).found).toBe(true);
    expect(findLinkInText('http://try.krispcall.com/tad/', 'try.krispcall.com/tad').found).toBe(true);
    expect(findLinkInText('https://try.krispcall.com/tad', 'https://try.krispcall.com/tadpole').found).toBe(false);
    expect(findLinkInText('https://try.krispcall.com/tad', text).excerpt).toContain('KrispCall');
  });
});
