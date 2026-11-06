import { describe, expect, it } from 'vitest';
import { matchCategory } from './category-match';

const categories = [{ slug: 'vpn', name: 'VPN' }, { slug: 'productivite', name: 'Productivité' }, { slug: 'heberg', name: 'Hébergement web' }];

describe('matchCategory', () => {
  it('retrouve la catégorie par son nom, accents et casse ignorés', () => {
    expect(matchCategory(categories, 'Productivité')?.slug).toBe('productivite');
    expect(matchCategory(categories, ' productivite ')?.slug).toBe('productivite');
    expect(matchCategory(categories, 'HEBERGEMENT WEB')?.slug).toBe('heberg');
  });

  it('retrouve la catégorie par son slug', () => {
    expect(matchCategory(categories, 'vpn')?.name).toBe('VPN');
  });

  it('ne choisit rien quand rien ne correspond', () => {
    expect(matchCategory(categories, 'Jardinage')).toBeUndefined();
    expect(matchCategory(categories, '')).toBeUndefined();
    expect(matchCategory(categories, null)).toBeUndefined();
  });
});
