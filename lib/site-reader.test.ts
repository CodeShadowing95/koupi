import { describe, expect, it, vi } from 'vitest';
import { isPrivateAddress, pageText, readSite, safeSiteUrl } from './site-reader';

const html = (body: string, headers: Record<string, string> = {}, status = 200) =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', ...headers } });
const publicDns = async () => ['93.184.216.34'];

describe('safeSiteUrl', () => {
  it('accepte un domaine public, passe en https et refuse le reste', () => {
    expect(safeSiteUrl('gradium.ai')?.toString()).toBe('https://gradium.ai/');
    expect(safeSiteUrl('http://cuure.com/fr')?.toString()).toBe('https://cuure.com/fr');
    for (const bad of ['http://127.0.0.1', 'https://[::1]/', 'https://localhost', 'https://admin.internal', 'ftp://x.com', 'https://a.com:8080', 'https://u:p@a.com', 'javascript:alert(1)', 'intranet']) {
      expect(safeSiteUrl(bad)).toBeNull();
    }
  });
});

describe('isPrivateAddress', () => {
  it('reconnaît les réseaux privés et locaux', () => {
    for (const ip of ['10.1.2.3', '127.0.0.1', '169.254.169.254', '172.20.0.1', '192.168.1.1', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1']) expect(isPrivateAddress(ip)).toBe(true);
    for (const ip of ['93.184.216.34', '172.32.0.1', '2606:4700::1111']) expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe('pageText', () => {
  it('garde le titre, la description et le texte visible sans scripts ni menus', () => {
    const page = pageText('<html><head><title>Gradium &amp; co</title><meta name="description" content="Voix par IA"><style>.x{}</style></head><body><nav>Menu</nav><h1>Des voix</h1><script>alert(1)</script><p>qui sonnent humain.</p><footer>Mentions</footer></body></html>');
    expect(page).toEqual({ title: 'Gradium & co', description: 'Voix par IA', text: 'Des voix\nqui sonnent humain.' });
  });
});

describe('readSite', () => {
  it('lit la page et suit une redirection sûre', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: '/fr' } }))
      .mockResolvedValueOnce(html('<title>Cuure</title><p>Vitamines personnalisées livrées chez vous chaque mois.</p>'));
    const result = await readSite('cuure.com', { fetchFn, resolve: publicDns });
    expect(result).toMatchObject({ ok: true, page: { url: 'https://cuure.com/fr', title: 'Cuure' } });
  });

  it('refuse un nom qui pointe vers un réseau privé ou une redirection interne', async () => {
    expect(await readSite('evil.com', { fetchFn: vi.fn(), resolve: async () => ['169.254.169.254'] })).toMatchObject({ ok: false });
    const fetchFn = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } }));
    expect(await readSite('evil.com', { fetchFn, resolve: publicDns })).toEqual({ ok: false, error: 'Le site redirige vers une adresse refusée.' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('dit pourquoi une page ne peut pas être lue', async () => {
    expect(await readSite('a.com', { fetchFn: vi.fn().mockResolvedValue(html('', {}, 503)), resolve: publicDns })).toEqual({ ok: false, error: 'Le site a.com a répondu 503.' });
    expect(await readSite('a.com', { fetchFn: vi.fn().mockResolvedValue(new Response('{}', { headers: { 'content-type': 'application/json' } })), resolve: publicDns })).toMatchObject({ ok: false });
    expect(await readSite('a.com', { fetchFn: vi.fn().mockRejectedValue(new Error('timeout')), resolve: publicDns })).toEqual({ ok: false, error: 'Le site a.com ne répond pas.' });
  });
});
