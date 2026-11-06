import { describe, expect, it } from 'vitest';
import { breadcrumbLd, creatorProfileLd, jsonLdText, siteLd } from './structured-data';

const base = 'https://merkod.com';

describe('breadcrumbLd', () => {
  it('numbers the steps and gives full addresses, the current page without one', () => {
    const ld = breadcrumbLd([{ label: 'Accueil', href: '/' }, { label: 'VPN', href: '/categories/vpn' }, { label: 'NordVPN' }], base);
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://merkod.com' },
      { '@type': 'ListItem', position: 2, name: 'VPN', item: 'https://merkod.com/categories/vpn' },
      { '@type': 'ListItem', position: 3, name: 'NordVPN' },
    ]);
  });
});

describe('creatorProfileLd', () => {
  it('describes the creator with their public accounts', () => {
    const ld = creatorProfileLd({ name: 'bienvenue au cabinet', path: '/creators/bac', accounts: ['https://youtube.com/@bac'], image: '/media/avatars/bac.jpg?v=1' }, base);
    expect(ld['@type']).toBe('ProfilePage');
    expect(ld.mainEntity).toMatchObject({ '@type': 'Person', name: 'bienvenue au cabinet', sameAs: ['https://youtube.com/@bac'], image: 'https://merkod.com/media/avatars/bac.jpg?v=1' });
  });
  it('leaves out what Merkod does not know', () => {
    const person = creatorProfileLd({ name: 'Ali', path: '/creators/ali', accounts: [] }, base).mainEntity as Record<string, unknown>;
    expect(person).not.toHaveProperty('sameAs');
    expect(person).not.toHaveProperty('image');
    expect(person).not.toHaveProperty('description');
  });
});

describe('siteLd', () => {
  it('names the site and its logo', () => {
    expect(siteLd(base)[1]).toMatchObject({ '@type': 'Organization', logo: 'https://merkod.com/merkod-icone-512.png' });
  });
});

describe('jsonLdText', () => {
  it('cannot close the script tag', () => {
    expect(jsonLdText({ name: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });
});
