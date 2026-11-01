import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCatalog, discountFromExcerpt, parseCsv, statusFromProposal } from '../scripts/build-catalog.mjs';
import catalog from './catalog.json';
import { codes, isPublic } from './data';

const toolsCsv = 'outil,categorie,site,recherche_youtube,priorite\nAbby,Finance et freelance,abby.fr,"Abby code promo",2\nRunway,IA,runwayml.com,"Runway promo",2\nDivi,E-commerce et site,elegantthemes.com,"Divi code promo",2\n';
const head = 'outil,categorie,code,chaine,titre_video,url_video,date_video,vues,extrait,lien,statut,proposition,raison\n';
const row = (tool: string, code: string, channel: string, views: number, excerpt: string, proposal: string, reason = '') =>
  `${tool},x,${code},${channel},Titre,https://www.youtube.com/watch?v=${code}${views},2026-10-01,${views},"${excerpt}",,à valider,${proposal},${reason}\n`;

describe('build-catalog', () => {
  it('reads quoted CSV cells with commas and quotes', () => {
    expect(parseCsv('a,b\n"x, ""y""",z\n')).toEqual([{ a: 'x, "y"', b: 'z' }]);
  });

  it('maps the first sort to admin statuses', () => {
    expect(statusFromProposal('ok probable')).toBe('to_test');
    expect(statusFromProposal('à vérifier')).toBe('pending');
    expect(statusFromProposal('non')).toBe('rejected');
  });

  it('reads a discount from the excerpt', () => {
    expect(discountFromExcerpt('-25 % avec le code LBL')).toBe('-25 %');
    expect(discountFromExcerpt('code YOAN : 3 mois offerts')).toBe('3 mois offerts');
    expect(discountFromExcerpt('Use code PAYTON')).toBe('Offre du créateur');
  });

  it('keeps manual data, lets a rejection win and only publishes tools with a public code', () => {
    const result = buildCatalog({
      toolsCsv,
      candidatesCsv: head
        + row('Abby', 'LBL', 'Le bon Logiciel', 118, '-25 % avec le code LBL', 'ok probable')
        + row('Abby', 'LBL', 'Autre chaîne', 5, 'code LBL', 'ok probable')
        + row('Runway', 'FALLFITS', 'wethrift', 12, 'Rent the Runway code FALLFITS', 'non', 'Rent the Runway')
        + row('Divi', 'FIFELIFE', 'The Fife Life', 71, 'Divi Discount Code: FIFELIFE', 'à vérifier'),
      manual: { descriptions: { abby: 'Facturation simple.' }, codes: [{ id: 'abby-manuel', tool: 'Abby', code: 'LBL', status: 'verified', votes: 5, success: 80 }, { id: 'run', tool: 'Runway', code: 'FALLFITS', status: 'verified' }] },
    });
    expect(result.codes).toHaveLength(3);
    expect(result.codes.find(code => code.code === 'LBL')).toMatchObject({ id: 'abby-manuel', status: 'verified', creator: 'Le bon Logiciel', votes: 5, discount: '-25 %' });
    expect(result.codes.find(code => code.code === 'FALLFITS')).toMatchObject({ status: 'rejected', note: 'Rent the Runway' });
    expect(result.codes.find(code => code.code === 'FIFELIFE')?.status).toBe('pending');
    expect(result.tools.map(tool => tool.slug)).toEqual(['abby']);
    expect(result.tools[0]).toMatchObject({ description: 'Facturation simple.', website: 'https://abby.fr', codes: 1 });
    expect(result.categories).toEqual([
      { slug: 'finance-et-freelance', name: 'Finance et freelance', count: 1 },
      { slug: 'ia', name: 'IA', count: 0 },
      { slug: 'e-commerce-et-site', name: 'E-commerce et site', count: 0 },
    ]);
    expect(result.tracked).toBe(3);
  });

  it('lib/catalog.json is up to date with data/ (run npm run catalog)', () => {
    const fresh = buildCatalog({
      toolsCsv: readFileSync('data/outils-v0.csv', 'utf8'),
      candidatesCsv: readFileSync('data/candidats-tous.csv', 'utf8'),
      manual: JSON.parse(readFileSync('data/catalogue-manuel.json', 'utf8')),
    });
    expect(catalog).toEqual(fresh);
  });
});

describe('data', () => {
  it('never shows pending or rejected codes on the public site', () => {
    expect(isPublic({ status: 'verified' })).toBe(true);
    expect(isPublic({ status: 'to_test' })).toBe(true);
    expect(isPublic({ status: 'pending' })).toBe(false);
    expect(isPublic({ status: 'rejected' })).toBe(false);
    expect(codes.some(code => code.status === 'rejected')).toBe(true);
  });
});
