import { describe, expect, it } from 'vitest';
import {
  MIN_SUBSCRIBERS, REJECT_BELOW, clip, creatorLevelOf, findCodeInText, implausibleCode, scoreVerification, sourceKindOf, spamSignals,
  type VerificationFacts,
} from './verification';

describe('creatorLevelOf', () => {
  it('donne « Créateur vérifié » au créateur qui a prouvé un compte contrôlé', () => {
    expect(creatorLevelOf({ claimed: true, adminChecked: true, subscribers: 1000 })).toBe('verified');
    expect(creatorLevelOf({ claimed: true, platformVerified: true })).toBe('verified');
    expect(creatorLevelOf({ claimed: true, adminChecked: true, subscribers: null, ratingCount: 50 })).toBe('verified');
  });
  it('ne donne rien à une preuve sur un compte sous le seuil d’audience', () => {
    expect(creatorLevelOf({ claimed: true })).toBe('spotted');
    expect(creatorLevelOf({ claimed: true, adminChecked: true, subscribers: 999 })).toBe('spotted');
    expect(creatorLevelOf({ claimed: true, adminChecked: true, ratingCount: 49 })).toBe('spotted');
  });
  it('donne « Contrôlé par Merkod » dès le badge de la plateforme', () => {
    expect(creatorLevelOf({ platformVerified: true, subscribers: 0 })).toBe('checked');
  });
  it('demande le contrôle de l’admin et le seuil d’abonnés', () => {
    expect(MIN_SUBSCRIBERS).toBe(1000);
    expect(creatorLevelOf({ adminChecked: true, subscribers: 1000 })).toBe('checked');
    expect(creatorLevelOf({ adminChecked: true, subscribers: null, ratingCount: 50 })).toBe('checked');
    expect(creatorLevelOf({ adminChecked: true, subscribers: null, ratingCount: 49 })).toBe('spotted');
    expect(creatorLevelOf({ adminChecked: false, ratingCount: 5000 })).toBe('spotted');
    expect(creatorLevelOf({ adminChecked: true, subscribers: 999 })).toBe('spotted');
    expect(creatorLevelOf({ adminChecked: false, subscribers: 50_000 })).toBe('spotted');
    expect(creatorLevelOf({})).toBe('spotted');
  });
});

describe('sourceKindOf', () => {
  it('reconnaît les plateformes', () => {
    expect(sourceKindOf('https://www.youtube.com/watch?v=abc')).toBe('youtube');
    expect(sourceKindOf('https://youtu.be/abc')).toBe('youtube');
    expect(sourceKindOf('https://m.youtube.com/watch?v=abc')).toBe('youtube');
    expect(sourceKindOf('https://podcasts.apple.com/fr/podcast/x/id1')).toBe('podcast');
    expect(sourceKindOf('https://open.spotify.com/episode/1')).toBe('podcast');
    expect(sourceKindOf('https://www.instagram.com/p/1')).toBe('instagram');
    expect(sourceKindOf('https://www.tiktok.com/@a/video/1')).toBe('tiktok');
    expect(sourceKindOf('https://exemple.fr')).toBe('other');
    expect(sourceKindOf('pas une adresse')).toBe('other');
  });
  it('ne se laisse pas tromper par un domaine qui imite YouTube', () => {
    expect(sourceKindOf('https://youtube.com.exemple.fr/watch')).toBe('other');
  });
});

describe('findCodeInText', () => {
  const description = 'Merci à Qonto de sponsoriser cette vidéo ! Avec le code MERKOD10, vous avez 10 % sur votre premier mois.';

  it('trouve le code sans tenir compte de la casse et rend un extrait', () => {
    const match = findCodeInText('merkod10', description);
    expect(match.found).toBe(true);
    expect(match.excerpt).toContain('MERKOD10');
  });
  it('ne compte que le mot entier', () => {
    expect(findCodeInText('MERKOD1', description).found).toBe(false);
    expect(findCodeInText('MERKOD10', 'code MERKOD100').found).toBe(false);
    expect(findCodeInText('OUPI10', description).found).toBe(false);
  });
  it('accepte un code avec des caractères spéciaux', () => {
    expect(findCodeInText('NORD-VPN+', 'utilisez NORD-VPN+ au paiement').found).toBe(true);
  });
  it('coupe l’extrait autour du code', () => {
    const long = `${'a '.repeat(200)}CODE42${' b'.repeat(200)}`;
    const match = findCodeInText('CODE42', long);
    expect(match.excerpt?.startsWith('…')).toBe(true);
    expect(match.excerpt?.endsWith('…')).toBe(true);
    expect(match.excerpt!.length).toBeLessThan(200);
  });
  it('rend une absence propre pour un code ou un texte vide', () => {
    expect(findCodeInText('  ', description)).toEqual({ found: false, excerpt: null });
    expect(findCodeInText('MERKOD10', '')).toEqual({ found: false, excerpt: null });
  });
});

describe('spamSignals', () => {
  it('ne signale rien pour une proposition normale', () => {
    expect(spamSignals({ sourceUrl: 'https://www.youtube.com/watch?v=abc', code: 'MERKOD10', comment: 'Vu dans la vidéo' })).toEqual([]);
  });
  it('signale un lien raccourci, plusieurs liens et un code avec espaces', () => {
    const signals = spamSignals({ sourceUrl: 'https://bit.ly/x', code: 'CODE 10', comment: 'https://a.fr et https://b.fr' });
    expect(signals).toHaveLength(3);
  });
  it('signale un lien invalide', () => {
    expect(spamSignals({ sourceUrl: 'nope', code: 'A' })).toEqual(['Le lien de la source est invalide.']);
  });
});

describe('scoreVerification', () => {
  const ideal: VerificationFacts = {
    sourceOnline: true, codeInSource: true, creatorLevel: 'checked', toolKnown: true, duplicate: false, spam: [],
  };

  it('donne un score élevé et des raisons à un code bien sourcé', () => {
    const result = scoreVerification(ideal);
    expect(result.score).toBe(100);
    expect(result.suggestion).toBe('review');
    expect(result.reasons.map(reason => reason.label)).toContain('Le code figure mot pour mot dans la source.');
  });
  it('affiche des lignes dont la somme tombe juste sur le score, point de départ compris', () => {
    const result = scoreVerification({ ...ideal, creatorLevel: 'spotted' });
    expect(result.reasons[0]).toEqual({ points: 30, label: 'Point de départ de tout code.' });
    expect(result.reasons.reduce((sum, reason) => sum + reason.points, 0)).toBe(result.score);
  });
  it('ne classe jamais clair un nombre seul ou une clé de licence', () => {
    const result = scoreVerification({ ...ideal, creatorLevel: 'spotted', implausible: implausibleCode('2026') });
    expect(result.score).toBe(40);
  });
  it('propose le rejet quand la source a disparu', () => {
    const result = scoreVerification({ ...ideal, sourceOnline: false, codeInSource: null });
    expect(result.score).toBeLessThan(REJECT_BELOW);
    expect(result.suggestion).toBe('reject');
  });
  it('propose le rejet quand le code est introuvable chez un créateur inconnu', () => {
    const result = scoreVerification({ ...ideal, codeInSource: false, creatorLevel: null });
    expect(result.suggestion).toBe('reject');
  });
  it('ne valide pas un code sur le seul nom d’un créateur vérifié', () => {
    const result = scoreVerification({ ...ideal, creatorLevel: 'verified', codeInSource: false });
    expect(result.score).toBeLessThan(50);
  });
  it('laisse un code pas encore lu dans la file, au milieu', () => {
    const result = scoreVerification({ ...ideal, sourceOnline: null, codeInSource: null, creatorLevel: 'spotted' });
    expect(result.score).toBe(40);
    expect(result.suggestion).toBe('review');
  });
  it('compte les doublons, le spam et les votes', () => {
    const base = scoreVerification({ ...ideal, sourceOnline: null, codeInSource: null }).score;
    expect(scoreVerification({ ...ideal, sourceOnline: null, codeInSource: null, duplicate: true }).score).toBe(base - 30);
    expect(scoreVerification({ ...ideal, sourceOnline: null, codeInSource: null, spam: ['x'] }).score).toBe(base - 20);
    expect(scoreVerification({ ...ideal, sourceOnline: null, codeInSource: null, votesUp: 1, votesDown: 4 }).score).toBe(base - 20);
    expect(scoreVerification({ ...ideal, sourceOnline: null, codeInSource: null, votesUp: 5, votesDown: 1 }).score).toBe(base + 10);
  });
  it('reste entre 0 et 100', () => {
    const worst = scoreVerification({
      sourceOnline: false, codeInSource: false, creatorLevel: null, toolKnown: false, duplicate: true, spam: ['a', 'b'], votesDown: 9,
    });
    expect(worst.score).toBe(0);
  });
});

describe('implausibleCode', () => {
  it('écarte un nombre seul et une clé de licence', () => {
    expect(implausibleCode('2026')).toMatch(/nombre/);
    expect(implausibleCode('3M3K9/5R92S/ZDH5Y/NA944')).toMatch(/clé de licence/);
    expect(implausibleCode('ABCD-EFGH-IJKL')).toMatch(/clé de licence/);
  });
  it('garde les vrais codes', () => {
    for (const code of ['NORD20', 'DIGITIZ', 'SUMMER-2026', 'CN-BITDEF', 'A1B2C3']) expect(implausibleCode(code)).toBeNull();
  });
});

describe('clip', () => {
  it('ne coupe jamais un emoji en deux', () => {
    expect(clip('ab🔗cd', 3)).toBe('ab');
    expect(clip('ab🔗cd', 4)).toBe('ab🔗');
  });
  it('donne un extrait sans moitié d’emoji', () => {
    // L'extrait commence 80 caractères avant le code, ici au milieu de l'emoji.
    const { excerpt } = findCodeInText('NORD20', `🔗${'y'.repeat(73)} code NORD20`);
    expect(excerpt?.startsWith('…y')).toBe(true);
  });
});
