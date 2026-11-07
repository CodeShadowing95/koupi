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

describe('code annoncé après le nom de l’outil', () => {
  const catalog = [...tools, { id: 't-lws', name: 'LWS', domain: 'lws.fr' }];
  it('prend le code qui suit le nom de l’outil, pas le nom', () => {
    expect(findPromoCodes('Code Promo LWS : CQ410 pour votre hébergement', catalog).map(found => [found.toolId, found.code])).toEqual([['t-lws', 'CQ410']]);
    expect(findPromoCodes('code promo NordVPN « NORD20 »', catalog).map(found => found.code)).toEqual(['NORD20']);
    expect(findPromoCodes('Accéder à l’offre officielle LWS avec réduction [Code Promo CQ410]', catalog).map(found => found.code)).toEqual(['CQ410']);
  });
  it('ne garde rien quand seul le nom de l’outil suit « code promo »', () => {
    expect(findPromoCodes('Le meilleur code promo LWS du moment', catalog)).toEqual([]);
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

describe('faux codes', () => {
  it('ignore une année, une clé de licence et un titre en capitales', () => {
    expect(findPromoCodes('NordVPN promo code 2026 : -70 %', tools)).toEqual([]);
    expect(findPromoCodes('NordVPN code 3M3K9/5R92S/ZDH5Y/NA944', tools)).toEqual([]);
    expect(findPromoCodes('Notion + Claude Code is SOMETHING ELSE!', tools)).toEqual([]);
    expect(findPromoCodes('NordVPN : code NORD20 pour -20 %', tools).map(found => found.code)).toEqual(['NORD20']);
  });
});

describe('domainOf', () => {
  it('rend le domaine sans www', () => {
    expect(domainOf('https://www.NordVPN.com/fr')).toBe('nordvpn.com');
    expect(domainOf('gradium.ai')).toBe('gradium.ai');
    expect(domainOf('pas une url')).toBeNull();
  });
});

// Vraie description d'une vidéo SolarFlowTech (octobre 2026) : un outil par ligne, le code sur la ligne d'en dessous.
const SOLARFLOWTECH = `Le solaire Plug & Play est-il menacé en France ? Entre NF C 15-100, démarches Enedis et réponse du Gouvernement, je décrypte ce qui change et les nuances à connaître avant de tirer des conclusions. ☀️🔌

🛠️ Matériel cité / recommandé dans cette vidéo : 
🔥 SUNETHIC : https://www.sunethic.fr/?ref=SOLARFLO...
➡️ Code promo : solarflow5

🍻 Soutenir la chaîne
• M’offrir une bière & du saucisson : https://buymeacoffee.com/solarflowtech
• Demandes de devis : https://www.viteundevis.com/in/?pid=2099
(Lien sponsorisé : aucun surcoût pour vous, et ça aide la chaîne — merci !)

⚡️ ÉNERGIE SOLAIRE & BATTERIES NOMADES
🔥INDEVOLT : https://fr.indevolt.com
➡️ Code de Réduction : SOLARFLOWTECH5%
🔥 ECOFLOW Stream : https://amzn.to/46YhhBc
🔥 AFERIY : https://fr.aferiy.com/?ref=SOLARFLOWTECH
➡️ Code promo : solarflowtech6
🔥 ALLPOWERS : https://iallpowers.fr/?ref=SolarflowTech
➡️ Code promo : solarflowtech
🔥 SUNETHIC : https://www.sunethic.fr/?ref=SOLARFLO...
➡️ Code promo : sunethic_solarflow

🤖 ROBOTS TONDEUSES & EXTÉRIEUR CONNECTÉ
🔥 MAMMOTION : https://fr.mammotion.com/?ref=solarfl...
🔥 Dreame : https://www.anrdoezrs.net/click-10155...
🔥 ANTHBOT : https://anthbot.com/?ref=SOLARFLOWTECH
➡️ Code promo : solarflowtechmower
🔥NAVIMOW : https://tidd.ly/4q5BDkL

🚲 MOBILITÉ ÉLECTRIQUE & ACCESSOIRES
🔥 ENGWE : https://fr.engwe.com/?ref=vqpnwltr
➡️ Code promo : solarflowtechbike
🔥 EVERCROSS : (lien à venir)
🔥 CARPODGO : https://www.carpodgo.com/?ref=solarfl...
➡️ Code promo : SOLARFLOWTECH

🏠 MAISON CONNECTÉE & HIGH TECH
🔥 Thermal Master : https://thermalmaster.com/?ref=SOLARF...
🔥 REOLINK : https://reolink.com/?aff=817
🔥X-SENSE : https://tidd.ly/48qtO2M 
🔥X-SENSE AMAZON : https://amzn.to/4n8ofus
🔥 Dreame : https://www.anrdoezrs.net/click-10155...
📣 SUIVEZ SOLARFLOWTECH
🔗 Facebook : SolarFlowTech
📧 solarflowtech64@gmail.com
⚠️ Certains liens sont affiliés : ils ne changent rien pour vous mais soutiennent la chaîne.`;

describe('description à plusieurs outils, codes sous le lien', () => {
  it('trouve les 8 codes, en minuscules, avec tiret bas ou % collé', () => {
    const { unknown } = scanPromoCodes(SOLARFLOWTECH, []);
    expect(unknown.map(item => [item.domain, item.code])).toEqual([
      ['sunethic.fr', 'solarflow5'], ['indevolt.com', 'SOLARFLOWTECH5%'], ['aferiy.com', 'solarflowtech6'], ['iallpowers.fr', 'solarflowtech'],
      ['sunethic.fr', 'sunethic_solarflow'], ['anthbot.com', 'solarflowtechmower'], ['engwe.com', 'solarflowtechbike'], ['carpodgo.com', 'SOLARFLOWTECH'],
    ]);
    // Le % du code n'est pas une réduction.
    expect(unknown.find(item => item.code === 'SOLARFLOWTECH5%')?.discount).toBe('Voir l’épisode');
  });

  it('rattache les codes aux outils du catalogue', () => {
    const { found } = scanPromoCodes(SOLARFLOWTECH, [{ id: 't-sun', name: 'Sunethic', domain: 'sunethic.fr' }, { id: 't-engwe', name: 'Engwe', domain: 'engwe.com' }]);
    expect(found.map(item => [item.toolId, item.code])).toEqual([['t-sun', 'solarflow5'], ['t-sun', 'sunethic_solarflow'], ['t-engwe', 'solarflowtechbike']]);
  });

  it('ne prend toujours pas un mot de phrase en minuscules pour un code', () => {
    expect(scanPromoCodes('Utilise le code promo pour avoir la réduction sur nordvpn.com', []).unknown).toEqual([]);
    expect(scanPromoCodes('Le code promo : merci beaucoup à tous sur nordvpn.com', []).unknown).toEqual([]);
    expect(scanPromoCodes('NordVPN : nordvpn.com, code : 20%', []).unknown).toEqual([]);
  });
});
