import { describe, expect, it } from 'vitest';
import { domainOf, findPromoCodes, notAToolName, scanPromoCodes } from './podcast-codes';

const tools = [
  { id: 't-nord', name: 'NordVPN' },
  { id: 't-qonto', name: 'Qonto' },
  { id: 't-notion', name: 'Notion' },
  { id: 't-ai', name: 'AI' },
];

describe('findPromoCodes', () => {
  it('trouve un code et son outil sur la même ligne, avec la réduction', () => {
    const found = findPromoCodes('Merci à NordVPN : -60 % avec le code promo GDIY sur nordvpn.com/gdiy', tools);
    expect(found).toEqual([{ toolId: 't-nord', code: 'GDIY', discount: '-60 %', evidence: 'Merci à NordVPN : -60 % avec le code promo GDIY sur nordvpn.com/gdiy' }]);
  });

  it('accepte « code : », les guillemets et l’anglais', () => {
    expect(findPromoCodes('Qonto, 3 mois offerts, code : « MARTINGALE »', tools)[0]).toMatchObject({ toolId: 't-qonto', code: 'MARTINGALE', discount: '3 mois offerts' });
    expect(findPromoCodes('Try Notion with promo code "SYNTAX20" for 20% off', tools)[0]).toMatchObject({ toolId: 't-notion', code: 'SYNTAX20', discount: '20%' });
  });

  it('regarde la ligne d’avant pour trouver l’outil', () => {
    const found = findPromoCodes('Ce podcast est sponsorisé par Qonto.\nUtilisez le code GENERATION pour 1 mois offert.', tools);
    expect(found[0]).toMatchObject({ toolId: 't-qonto', code: 'GENERATION', discount: '1 mois offert' });
  });

  it('ignore une ligne sans outil du catalogue, et les mots courants pris pour des codes', () => {
    expect(findPromoCodes('Code promo FROMAGE chez mon fromager', tools)).toEqual([]);
    expect(findPromoCodes('NordVPN : le code est dans la description', tools)).toEqual([]);
    expect(findPromoCodes('Le code source de Notion est fermé', tools)).toEqual([]);
  });

  it('ne confond pas un nom d’outil court avec un morceau de mot', () => {
    expect(findPromoCodes('Le code PAIR est valable chez Daily', tools)).toEqual([]);
  });

  it('choisit l’outil le plus proche du code et ne garde pas deux fois le même', () => {
    const found = findPromoCodes('Notion et NordVPN nous soutiennent. Chez NordVPN, code MERKOD.\nRappel NordVPN : code MERKOD', tools);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ toolId: 't-nord', code: 'MERKOD', discount: 'Voir l’épisode' });
  });
});

describe('scanPromoCodes', () => {
  const gdiy = [
    'Je vous ai négocié un code promo : -10% avec le code GDIY sur https://gradium.ai/',
    'Un grand MERCI à nos sponsors :',
    'Qonto: https://qonto.com/r/2i7tk9',
    'Cuure : https://cuure.com/product-onely',
    '(code DOIT)',
    'Notre film est dispo : https://taap.it/rewrosY (code FILM sur youtube.com)',
  ].join('\n');

  it('garde les codes d’outils absents du catalogue, avec le nom deviné du lien voisin', () => {
    const { found, unknown } = scanPromoCodes(gdiy, tools);
    expect(found).toEqual([]);
    expect(unknown).toEqual([
      { name: 'Gradium', domain: 'gradium.ai', code: 'GDIY', discount: '-10%', evidence: 'Je vous ai négocié un code promo : -10% avec le code GDIY sur https://gradium.ai/' },
      { name: 'Cuure', domain: 'cuure.com', code: 'DOIT', discount: 'Voir l’épisode', evidence: 'Cuure : https://cuure.com/product-onely\n(code DOIT)' },
    ]);
  });

  it('reconnaît un outil du catalogue par son site', () => {
    const { found, unknown } = scanPromoCodes('Le code GDIY sur gradium.ai', [...tools, { id: 't-gradium', name: 'Gradium Voice', domain: 'gradium.ai' }]);
    expect(found).toMatchObject([{ toolId: 't-gradium', code: 'GDIY' }]);
    expect(unknown).toEqual([]);
  });

  it('devine le nom au début de la ligne sans lien', () => {
    expect(scanPromoCodes('Alan : 1 mois offert avec le code SANTE', tools).unknown).toMatchObject([{ name: 'Alan', domain: null, code: 'SANTE', discount: '1 mois offert' }]);
  });

  it('ne reprend pas l’outil de la ligne d’avant quand la ligne nomme le sien', () => {
    const { found, unknown } = scanPromoCodes('NordVPN : code CARNE\nGradium : code GDIY sur gradium.ai', [{ id: 't-nord', name: 'NordVPN' }]);
    expect(found).toMatchObject([{ toolId: 't-nord', code: 'CARNE' }]);
    expect(unknown).toMatchObject([{ name: 'Gradium', domain: 'gradium.ai', code: 'GDIY', evidence: 'Gradium : code GDIY sur gradium.ai' }]);
    expect(scanPromoCodes('NordVPN, le VPN\n-60 % avec le code CARNE', [{ id: 't-nord', name: 'NordVPN' }]).found).toMatchObject([{ toolId: 't-nord' }]);
  });

  it('ne prend pas une étiquette ni une plateforme de paiement pour un outil', () => {
    expect(scanPromoCodes('Avantages : avec le code PODCAST20, -20 % sur la formation', tools).unknown).toEqual([]);
    expect(scanPromoCodes('Ma formation : https://ana.thrivecart.com/formation code ANA30', tools).unknown).toEqual([]);
    expect(scanPromoCodes('La boutique sur systeme.io, code BOUTIQUE10', tools).unknown).toEqual([]);
    expect(notAToolName('Avantages')).toBe(true);
    expect(notAToolName('Thrivecart')).toBe(true);
    expect(notAToolName('Gradium')).toBe(false);
  });

  it('ne garde rien sans indice sur l’outil', () => {
    expect(scanPromoCodes('utilisez le code MERCI', tools).unknown).toEqual([]);
  });
});

describe('domainOf', () => {
  it('rend le domaine sans www', () => {
    expect(domainOf('https://www.NordVPN.com/fr')).toBe('nordvpn.com');
    expect(domainOf('gradium.ai')).toBe('gradium.ai');
    expect(domainOf('pas une url')).toBeNull();
  });
});
