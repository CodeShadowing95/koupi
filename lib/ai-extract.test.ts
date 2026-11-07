import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_AI_MODEL, DEFAULT_REVIEW_MODEL, MAX_DESCRIPTION_CHARS, aiConfigFrom, aiStatusOf, costUsdMicros, extractCodes, keepVerbatimCodes,
  needsSecondReading, type Extraction,
} from './ai-extract';

const description = 'Merci à Qonto ! Avec le code MERKOD10 vous avez 10 % sur 3 mois, jusqu’au 31/12. Et NordVPN : code NORD20.';

function fakeResponse(text: string, extra: Partial<Anthropic.Beta.BetaMessage> = {}): Anthropic.Beta.BetaMessage {
  return {
    id: 'msg_1', type: 'message', role: 'assistant', model: DEFAULT_AI_MODEL, stop_reason: 'end_turn',
    content: [{ type: 'text', text }],
    usage: { input_tokens: 1000, output_tokens: 200 },
    ...extra,
  } as unknown as Anthropic.Beta.BetaMessage;
}

describe('aiConfigFrom', () => {
  it('reste inactive sans clé et applique les valeurs par défaut', () => {
    const config = aiConfigFrom({});
    expect(config).toEqual({ apiKey: null, model: 'claude-haiku-5-5', reviewModel: 'claude-opus-5-5', monthlyBudgetUsdMicros: 12_000_000, usdPerEur: 1.2 });
  });
  it('lit la clé, le modèle et le plafond', () => {
    const config = aiConfigFrom({ ANTHROPIC_API_KEY: ' sk ', AI_MODEL: 'claude-sonnet-5-5', AI_REVIEW_MODEL: 'claude-fable-5-1', AI_MONTHLY_BUDGET_EUR: '20', AI_USD_PER_EUR: '1' });
    expect(config).toEqual({ apiKey: 'sk', model: 'claude-sonnet-5-5', reviewModel: 'claude-fable-5-1', monthlyBudgetUsdMicros: 20_000_000, usdPerEur: 1 });
  });
  it('ignore un plafond invalide', () => {
    expect(aiConfigFrom({ AI_MONTHLY_BUDGET_EUR: 'abc' }).monthlyBudgetUsdMicros).toBe(12_000_000);
    expect(aiConfigFrom({ AI_MONTHLY_BUDGET_EUR: '-5' }).monthlyBudgetUsdMicros).toBe(12_000_000);
  });
});

describe('aiStatusOf', () => {
  it('annonce l’IA en attente sans clé', () => {
    expect(aiStatusOf(aiConfigFrom({}), 0)).toEqual({ state: 'inactive', label: 'IA en attente d’activation' });
  });
  it('s’arrête au plafond du mois', () => {
    const config = aiConfigFrom({ ANTHROPIC_API_KEY: 'k' });
    expect(aiStatusOf(config, 1_000).state).toBe('active');
    expect(aiStatusOf(config, 12_000_000).state).toBe('budget_reached');
  });
});

describe('costUsdMicros', () => {
  it('compte les jetons au prix du modèle', () => {
    expect(costUsdMicros('claude-opus-5-5', { input_tokens: 1000, output_tokens: 200 })).toBe(8000);
    expect(costUsdMicros('claude-haiku-5-5', { input_tokens: 1000, output_tokens: 200 })).toBe(200);
  });
  it('prend le prix le plus élevé connu pour un modèle inconnu', () => {
    expect(costUsdMicros('autre', { input_tokens: 1000, output_tokens: 0 })).toBe(4000);
  });
});

describe('keepVerbatimCodes', () => {
  it('écarte les codes inventés et les doublons, garde la preuve', () => {
    const codes = keepVerbatimCodes({ codes: [
      { code: 'MERKOD10', tool: 'Qonto', discount: '10 %', conditions: '3 mois', expires_on: '2026-12-31' },
      { code: 'merkod10', tool: 'Qonto', discount: '', conditions: '', expires_on: '' },
      { code: 'INVENTE', tool: 'X', discount: '', conditions: '', expires_on: '' },
      { code: 'NORD20', tool: 'NordVPN', discount: '', conditions: '', expires_on: '31/12' },
    ] }, description);
    expect(codes.map(c => c.code)).toEqual(['MERKOD10', 'NORD20']);
    expect(codes[0].evidence).toContain('MERKOD10');
    expect(codes[0].expiresOn).toBe('2026-12-31');
    expect(codes[1].expiresOn).toBe('');
  });
  it('écarte une réduction lue comme un code', () => {
    const notes = 'Members also get 10-30% off merch. Use code BOYDAD at instantly.ai.';
    const codes = keepVerbatimCodes({ codes: [
      { code: '10-30% off merch', tool: 'Patreon', discount: '10-30%', conditions: '', expires_on: '' },
      { code: 'BOYDAD', tool: 'Instantly', discount: '', conditions: '', expires_on: '' },
    ] }, notes);
    expect(codes.map(c => c.code)).toEqual(['BOYDAD']);
  });
  it('supporte une réponse vide ou mal formée', () => {
    expect(keepVerbatimCodes(null, description)).toEqual([]);
    expect(keepVerbatimCodes({ codes: 'x' }, description)).toEqual([]);
    expect(keepVerbatimCodes({ codes: [{ code: 42 }] }, description)).toEqual([]);
  });

  it('garde une offre par lien seulement si le lien est écrit et l’offre annoncée', () => {
    const notes = [
      '- KrispCall : -20 % sur le premier mois avec https://try.krispcall.com/tad',
      '- Notion : https://notion.so/ana',
      '- Ma chaîne : https://youtube.com/@ana',
      '- Qonto, code ANA10 : https://qonto.com/r/ana',
    ].join('\n');
    const codes = keepVerbatimCodes({ codes: [
      { code: '', link: 'https://try.krispcall.com/tad', tool: 'KrispCall', discount: '-20 % sur le premier mois', conditions: '', expires_on: '' },
      { code: '', link: 'https://notion.so/ana', tool: 'Notion', discount: '', conditions: '', expires_on: '' },
      { code: '', link: 'https://youtube.com/@ana', tool: 'YouTube', discount: '-10 %', conditions: '', expires_on: '' },
      { code: '', link: 'https://invente.com/x', tool: 'Invente', discount: '-10 %', conditions: '', expires_on: '' },
      { code: 'ANA10', link: 'https://qonto.com/r/ana', tool: 'Qonto', discount: '', conditions: '', expires_on: '' },
      { code: '', link: 'https://try.krispcall.com/tad', tool: 'KrispCall', discount: '-20 %', conditions: '', expires_on: '' },
    ] }, notes);
    expect(codes.map(c => [c.code, c.link])).toEqual([['', 'https://try.krispcall.com/tad'], ['ANA10', 'https://qonto.com/r/ana']]);
    expect(codes[0].evidence).toContain('try.krispcall.com/tad');
  });

  it('garde un code sans le lien quand l’IA invente le lien', () => {
    const codes = keepVerbatimCodes({ codes: [{ code: 'NORD20', link: 'https://nordvpn.com/invente', tool: 'NordVPN', discount: '', conditions: '', expires_on: '' }] }, description);
    expect(codes.map(c => [c.code, c.link])).toEqual([['NORD20', '']]);
  });
});

describe('keepVerbatimCodes et faux codes', () => {
  it('écarte une année et une clé de licence même présentes dans le texte', () => {
    const text = 'Bitdefender promo code 2026, clé 3M3K9/5R92S/ZDH5Y/NA944, code BITDEF20';
    const codes = keepVerbatimCodes({ codes: ['2026', '3M3K9/5R92S/ZDH5Y/NA944', 'BITDEF20'].map(code => ({ code, tool: 'Bitdefender', discount: '', conditions: '', expires_on: '' })) }, text);
    expect(codes.map(item => item.code)).toEqual(['BITDEF20']);
  });
});

describe('extractCodes', () => {
  it('envoie la description comme donnée et rend les codes vérifiés avec le coût', async () => {
    const create = vi.fn(async (_params: Anthropic.Beta.MessageCreateParamsNonStreaming) => fakeResponse(JSON.stringify({ codes: [{ code: 'NORD20', tool: 'NordVPN', discount: '', conditions: '', expires_on: '' }] })));
    const result = await extractCodes(create, DEFAULT_AI_MODEL, { title: 'Vidéo', description });
    expect(result).toMatchObject({ refused: false, costUsdMicros: 200, model: DEFAULT_AI_MODEL });
    expect(result.codes.map(c => c.code)).toEqual(['NORD20']);
    const params = create.mock.calls[0][0];
    expect(JSON.stringify(params.messages)).toContain('<description>');
    expect(params.output_config?.format?.type).toBe('json_schema');
    expect(params.fallbacks).toBeUndefined();
  });
  it('demande le repli automatique seulement aux modèles qui l’acceptent', async () => {
    const create = vi.fn(async (_params: Anthropic.Beta.MessageCreateParamsNonStreaming) => fakeResponse('{"codes":[]}', { model: DEFAULT_REVIEW_MODEL }));
    const result = await extractCodes(create, DEFAULT_REVIEW_MODEL, { title: 't', description });
    expect(create.mock.calls[0][0]).toMatchObject({ fallbacks: 'default', betas: ['server-side-fallback-2026-07-01'] });
    expect(result.costUsdMicros).toBe(8000);
  });
  it('coupe une description trop longue', async () => {
    const create = vi.fn(async (_params: Anthropic.Beta.MessageCreateParamsNonStreaming) => fakeResponse('{"codes":[]}'));
    await extractCodes(create, DEFAULT_AI_MODEL, { title: 't', description: 'a'.repeat(MAX_DESCRIPTION_CHARS + 500) });
    const params = create.mock.calls[0][0];
    expect(JSON.stringify(params.messages).length).toBeLessThan(MAX_DESCRIPTION_CHARS + 400);
  });
  it('rend une liste vide sur un refus ou un JSON invalide, en comptant le coût', async () => {
    const refused = await extractCodes(async () => fakeResponse('', { stop_reason: 'refusal' }), DEFAULT_AI_MODEL, { title: 't', description });
    expect(refused).toMatchObject({ refused: true, codes: [], costUsdMicros: 200 });
    const broken = await extractCodes(async () => fakeResponse('pas du json'), DEFAULT_AI_MODEL, { title: 't', description });
    expect(broken).toMatchObject({ refused: false, codes: [] });
  });
});

describe('needsSecondReading', () => {
  const found: Extraction = { codes: [{ code: 'A', link: '', tool: '', discount: '', conditions: '', expiresOn: '', evidence: '' }], model: 'm', costUsdMicros: 0, refused: false };
  const empty: Extraction = { ...found, codes: [] };

  it('relit après un refus', () => {
    expect(needsSecondReading({ extraction: { ...empty, refused: true }, description: 'x' })).toBe(true);
  });
  it('relit quand rien n’est trouvé alors que la description parle de promo', () => {
    expect(needsSecondReading({ extraction: empty, description: 'Profitez de -20 % avec mon code' })).toBe(true);
    expect(needsSecondReading({ extraction: empty, description: 'Une vidéo sur la cuisine' })).toBe(false);
  });
  it('relit les scores douteux seulement', () => {
    expect(needsSecondReading({ extraction: found, description: '', score: 40 })).toBe(true);
    expect(needsSecondReading({ extraction: found, description: '', score: 85 })).toBe(false);
    expect(needsSecondReading({ extraction: found, description: '', score: 10 })).toBe(false);
    expect(needsSecondReading({ extraction: found, description: '' })).toBe(false);
  });
});
