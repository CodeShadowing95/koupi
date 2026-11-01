import { describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from './turnstile';

const reply = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe('vérification Turnstile', () => {
  it('accepte un jeton validé par Cloudflare', async () => {
    const fetcher = reply({ success: true });
    expect(await verifyTurnstile('jeton', 'secret', '203.0.113.1', fetcher)).toBe(true);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const sent = init.body as URLSearchParams;
    expect(sent.get('secret')).toBe('secret');
    expect(sent.get('response')).toBe('jeton');
    expect(sent.get('remoteip')).toBe('203.0.113.1');
  });

  it('refuse un jeton rejeté par Cloudflare', async () => {
    expect(await verifyTurnstile('jeton', 'secret', '203.0.113.1', reply({ success: false, 'error-codes': ['invalid-input-response'] }))).toBe(false);
  });

  it('refuse sans appeler Cloudflare quand le jeton est vide ou trop long', async () => {
    const fetcher = reply({ success: true });
    expect(await verifyTurnstile('', 'secret', '203.0.113.1', fetcher)).toBe(false);
    expect(await verifyTurnstile('x'.repeat(2049), 'secret', '203.0.113.1', fetcher)).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('refuse quand Cloudflare ne répond pas correctement', async () => {
    expect(await verifyTurnstile('jeton', 'secret', '203.0.113.1', reply({}, 500))).toBe(false);
    expect(await verifyTurnstile('jeton', 'secret', '203.0.113.1', vi.fn(async () => { throw new Error('réseau'); }))).toBe(false);
  });

  it('n’envoie pas d’IP inconnue à Cloudflare', async () => {
    const fetcher = reply({ success: true });
    await verifyTurnstile('jeton', 'secret', 'unknown', fetcher);
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.body as URLSearchParams).has('remoteip')).toBe(false);
  });
});
