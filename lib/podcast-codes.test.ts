import { describe, expect, it } from 'vitest';
import { findPromoCodes } from './podcast-codes';

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
    const found = findPromoCodes('Notion et NordVPN nous soutiennent. Chez NordVPN, code KOUPI.\nRappel NordVPN : code KOUPI', tools);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ toolId: 't-nord', code: 'KOUPI', discount: 'Voir l’épisode' });
  });
});
