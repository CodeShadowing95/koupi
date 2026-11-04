import { describe, expect, it, vi } from 'vitest';
import { mailerFromEnv, resendMailer, signInMail } from './creator-mail';

describe('e-mail de connexion', () => {
  it('contient le lien, la durée et échappe le nom', () => {
    const mail = signInMail('ana@exemple.fr', 'https://koupi.test/creator/sign-in?token=abc', 'Ana <b>');
    expect(mail.subject).toBe('Ton accès à la page Ana <b> sur Merkod');
    expect(mail.text).toContain('https://koupi.test/creator/sign-in?token=abc');
    expect(mail.text).toContain('20 minutes');
    expect(mail.html).toContain('Ana &lt;b&gt;');
    expect(mail.html).not.toContain('Ana <b>');
  });
  it('envoie par Resend avec la clé', async () => {
    const fetchFn = vi.fn(async (_url: string, _init: RequestInit) => new Response('{}'));
    await resendMailer('re_key', 'Merkod <bonjour@koupi.fr>', fetchFn as unknown as typeof fetch)(signInMail('ana@exemple.fr', 'https://k/x', null));
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer re_key');
    expect(JSON.parse(init.body as string)).toMatchObject({ from: 'Merkod <bonjour@koupi.fr>', to: ['ana@exemple.fr'] });
    const failing = vi.fn(async () => new Response('{}', { status: 422 }));
    await expect(resendMailer('k', 'f', failing as unknown as typeof fetch)(signInMail('a@b.co', 'https://k/x', null))).rejects.toThrow('Resend 422');
  });
  it('reste fermé en production sans Resend, affiche le lien en local', () => {
    expect(mailerFromEnv({ NODE_ENV: 'production' })).toBeNull();
    expect(mailerFromEnv({ NODE_ENV: 'development' })).toBeTypeOf('function');
    expect(mailerFromEnv({ NODE_ENV: 'production', RESEND_API_KEY: 'k', EMAIL_FROM: 'f' })).toBeTypeOf('function');
  });
});
