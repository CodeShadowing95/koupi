import { describe, expect, it, vi } from 'vitest';
import { mailerFromEnv, resendMailer, signInMail } from './creator-mail';

describe('e-mail de connexion', () => {
  it('contient le lien, la durée et échappe le nom', () => {
    const mail = signInMail('ana@exemple.fr', 'https://koupi.test/creator/sign-in?token=abc', 'Ana <b>');
    expect(mail.subject).toMatch(/^Ton accès à la page Ana <b> sur Merkod \(\d\d:\d\d\)$/);
    expect(mail.text).toContain('https://koupi.test/creator/sign-in?token=abc');
    expect(mail.text).toContain('20 minutes');
    expect(mail.html).toContain('Ana &lt;b&gt;');
    expect(mail.html).not.toContain('Ana <b>');
  });
  it('rend chaque envoi unique pour que Gmail ne cache pas le lien', () => {
    const now = new Date('2026-11-08T08:19:00Z');
    const first = signInMail('ana@exemple.fr', 'https://k/a', null, now, 'id-1');
    const second = signInMail('ana@exemple.fr', 'https://k/b', null, new Date('2026-11-08T08:25:00Z'), 'id-2');
    expect(first.subject).toBe('Ton lien de connexion à Merkod (09:19)');
    expect(first.text).toContain('Demandé le dimanche 8 novembre à 09:19.');
    expect(first.html).toContain('Demandé le dimanche 8 novembre à 09:19.');
    expect(first.subject).not.toBe(second.subject);
    expect(first.headers).toEqual({ 'X-Entity-Ref-ID': 'id-1' });
    expect(signInMail('a@b.co', 'https://k/x', null).headers?.['X-Entity-Ref-ID']).not.toBe(signInMail('a@b.co', 'https://k/x', null).headers?.['X-Entity-Ref-ID']);
  });
  it('envoie par Resend avec la clé', async () => {
    const fetchFn = vi.fn(async (_url: string, _init: RequestInit) => new Response('{}'));
    await resendMailer('re_key', 'Merkod <bonjour@koupi.fr>', fetchFn as unknown as typeof fetch)(signInMail('ana@exemple.fr', 'https://k/x', null));
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer re_key');
    expect(JSON.parse(init.body as string)).toMatchObject({ from: 'Merkod <bonjour@koupi.fr>', to: ['ana@exemple.fr'], headers: { 'X-Entity-Ref-ID': expect.any(String) } });
    const failing = vi.fn(async () => new Response('{}', { status: 422 }));
    await expect(resendMailer('k', 'f', failing as unknown as typeof fetch)(signInMail('a@b.co', 'https://k/x', null))).rejects.toThrow('Resend 422');
  });
  it('reste fermé en production sans Resend, affiche le lien en local', () => {
    expect(mailerFromEnv({ NODE_ENV: 'production' })).toBeNull();
    expect(mailerFromEnv({ NODE_ENV: 'development' })).toBeTypeOf('function');
    expect(mailerFromEnv({ NODE_ENV: 'production', RESEND_API_KEY: 'k', EMAIL_FROM: 'f' })).toBeTypeOf('function');
  });
});
