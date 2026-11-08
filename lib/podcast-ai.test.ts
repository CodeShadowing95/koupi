import { describe, expect, it } from 'vitest';
import type { ExtractedCode } from './ai-extract';
import { forVideo, mergeAiCodes, PROMO_HINT } from './podcast-ai';

const tools = [{ id: 't-nord', name: 'NordVPN', domain: 'nordvpn.com' }, { id: 't-qonto', name: 'Qonto', domain: 'qonto.com' }];
const ai = (code: string, extra: Partial<ExtractedCode> = {}): ExtractedCode => ({ code, link: '', tool: '', discount: '', conditions: '', expiresOn: '', evidence: `code ${code}`, ...extra });

describe('mergeAiCodes', () => {
  it('range une offre par lien sous l’outil de son site, ou en outil à ajouter', () => {
    const scan = { found: [], unknown: [] };
    const merged = mergeAiCodes(scan, [
      ai('', { link: 'https://go.nordvpn.com/ana', discount: '-70 %', evidence: 'NordVPN -70 % : https://go.nordvpn.com/ana' }),
      ai('', { link: 'https://try.krispcall.com/tad', tool: 'KrispCall', discount: '-20 %', evidence: 'KrispCall : https://try.krispcall.com/tad' }),
    ], tools);
    expect(merged.found).toEqual([expect.objectContaining({ toolId: 't-nord', code: '', link: 'https://go.nordvpn.com/ana', discount: '-70 %' })]);
    expect(merged.unknown).toEqual([expect.objectContaining({ name: 'KrispCall', domain: 'krispcall.com', code: '', link: 'https://try.krispcall.com/tad' })]);
  });

  it('ajoute le lien lu par l’IA à un code déjà repéré', () => {
    const scan = { found: [{ toolId: 't-nord', code: 'CARNE', discount: '-70 %', evidence: 'NordVPN code CARNE' }], unknown: [] };
    const merged = mergeAiCodes(scan, [ai('CARNE', { link: 'https://nordvpn.com/carne' })], tools);
    expect(merged.found[0]).toMatchObject({ code: 'CARNE', link: 'https://nordvpn.com/carne' });
  });

  it('complète la réduction et la date d’un code déjà repéré, sans le doubler', () => {
    const scan = { found: [{ toolId: 't-nord', code: 'CARNE', discount: 'Voir l’épisode', evidence: 'NordVPN code CARNE' }], unknown: [] };
    const merged = mergeAiCodes(scan, [ai('carne', { tool: 'NordVPN', discount: '-60 % sur 2 ans', expiresOn: '2026-12-31' })], tools);
    expect(merged.found).toEqual([{ toolId: 't-nord', code: 'CARNE', discount: '-60 % sur 2 ans', evidence: 'NordVPN code CARNE', expiresOn: '2026-12-31' }]);
    expect(scan.found[0].discount).toBe('Voir l’épisode');
  });

  it('suit l’IA quand elle rattache un code à un autre outil que le repérage sans IA', () => {
    const scan = { found: [{ toolId: 't-nord', code: 'GDIY', discount: 'Voir l’épisode', evidence: 'NordVPN, et Gradium : code GDIY sur gradium.ai' }, { toolId: 't-nord', code: 'BANQUE', discount: '-5 %', evidence: 'NordVPN, Qonto : code BANQUE' }], unknown: [] };
    const merged = mergeAiCodes(scan, [ai('GDIY', { tool: 'Gradium', discount: '-10 %', evidence: 'Gradium : code GDIY sur gradium.ai' }), ai('BANQUE', { tool: 'Qonto' })], tools);
    expect(merged.found).toMatchObject([{ toolId: 't-qonto', code: 'BANQUE', discount: '-5 %' }]);
    expect(merged.unknown).toMatchObject([{ name: 'Gradium', domain: 'gradium.ai', code: 'GDIY', discount: '-10 %' }]);
  });

  it('relie un code lu par l’IA à l’outil du catalogue, par son nom ou son site', () => {
    const merged = mergeAiCodes({ found: [], unknown: [] }, [
      ai('BANQUE', { tool: 'Qonto Business', discount: '1 mois offert' }),
      ai('VPN60', { tool: 'un VPN', evidence: 'sur nordvpn.com/carne avec VPN60' }),
    ], tools);
    expect(merged.found).toMatchObject([{ toolId: 't-qonto', code: 'BANQUE', discount: '1 mois offert' }, { toolId: 't-nord', code: 'VPN60', discount: 'Voir l’épisode' }]);
  });

  it('garde en outil à ajouter un code dont l’outil manque au catalogue', () => {
    const merged = mergeAiCodes({ found: [], unknown: [] }, [
      ai('GDIY', { tool: 'Gradium', discount: '-10%', evidence: 'le code GDIY sur https://gradium.ai' }),
      ai('SANSRIEN', { tool: '', evidence: 'code SANSRIEN' }),
      ai('LIEN', { tool: '', evidence: 'code LIEN sur cuure.com' }),
    ], tools);
    expect(merged.unknown).toEqual([
      { name: 'Gradium', domain: 'gradium.ai', code: 'GDIY', discount: '-10%', evidence: 'le code GDIY sur https://gradium.ai' },
      { name: 'Cuure', domain: 'cuure.com', code: 'LIEN', discount: 'Voir l’épisode', evidence: 'code LIEN sur cuure.com' },
    ]);
  });

  it('ne rattache pas un outil absent du catalogue à l’outil cité plus loin dans l’extrait', () => {
    const catalog = [...tools, { id: 't-incogni', name: 'Incogni', domain: 'incogni.com' }];
    const evidence = '1. Autodoc — code Baptiste (Baptiste Pitois) 2. Saily — code NOZMAN (Dr Nozman) 3. Incogni — code ASTRONOGEEK';
    const merged = mergeAiCodes({ found: [], unknown: [] }, [
      ai('Baptiste', { tool: 'Autodoc', evidence }),
      ai('NOZMAN', { tool: 'Saily', evidence }),
      ai('ASTRONOGEEK', { tool: 'Incogni', evidence }),
    ], catalog);
    expect(merged.found.map(item => [item.code, item.toolId])).toEqual([['ASTRONOGEEK', 't-incogni']]);
    expect(merged.unknown.map(item => [item.code, item.name])).toEqual([['Baptiste', 'Autodoc'], ['NOZMAN', 'Saily']]);
  });

  it('ne garde pas en outil à ajouter une étiquette ou une plateforme de paiement nommée par l’IA', () => {
    const merged = mergeAiCodes({ found: [], unknown: [] }, [
      ai('PODCAST20', { tool: 'Avantages', evidence: 'Avantages : avec le code PODCAST20' }),
      ai('ANA30', { tool: 'Thrivecart', evidence: 'ma formation sur ana.thrivecart.com, code ANA30' }),
    ], tools);
    expect(merged.unknown).toEqual([]);
  });

  it('n’appelle l’IA que si les notes parlent d’une offre', () => {
    expect(PROMO_HINT.test('Avec le code CARNE')).toBe(true);
    expect(PROMO_HINT.test('-20 % sur tout')).toBe(true);
    expect(PROMO_HINT.test('Une discussion sur la musique')).toBe(false);
  });
});

describe('forVideo', () => {
  it('parle de vidéo quand la réduction n’est pas écrite', () => {
    expect(forVideo([{ discount: 'Voir l’épisode' }, { discount: '-10 %' }])).toEqual([{ discount: 'Voir la vidéo' }, { discount: '-10 %' }]);
  });
});
