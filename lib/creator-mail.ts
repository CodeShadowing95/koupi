// E-mails envoyés aux créateurs (ADR-0021). Envoi par l'API HTTP de Resend, sans dépendance :
// RESEND_API_KEY et EMAIL_FROM (adresse d'un domaine vérifié chez Resend) suffisent.
// Sans eux : en local, le lien s'affiche dans la console ; en production, la connexion reste fermée.
import { SIGN_IN_MINUTES } from './creator-auth';

export type Mail = { to: string; subject: string; text: string; html: string };
export type Mailer = (mail: Mail) => Promise<void>;

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

/** Le message de connexion : court, un seul bouton, lisible même sans HTML. */
export function signInMail(to: string, link: string, creatorName: string | null): Mail {
  const subject = creatorName ? `Ton accès à la page ${creatorName} sur Koupi` : 'Ton lien de connexion à Koupi';
  const lead = creatorName
    ? `Voici ton lien pour entrer dans ton espace et suivre les copies de tes codes sur la page ${creatorName}.`
    : 'Voici ton lien pour entrer dans ton espace créateur Koupi.';
  const text = [
    'Bonjour,', '', lead, '', link, '',
    `Le lien marche une seule fois, pendant ${SIGN_IN_MINUTES} minutes. Si tu n’as rien demandé, ignore cet e-mail.`, '', 'L’équipe Koupi',
  ].join('\n');
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:32px 16px;background:#F6F4EE;font-family:Arial,Helvetica,sans-serif;color:#14142B">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
<p style="margin:0 0 8px;font-size:22px;font-weight:800">Koupi</p>
<p style="font-size:16px;line-height:1.5">${escape(lead)}</p>
<p style="margin:28px 0"><a href="${escape(link)}" style="display:inline-block;background:#2A3BD6;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px">Entrer dans mon espace</a></p>
<p style="font-size:13px;color:#5B5B73;line-height:1.5">Le lien marche une seule fois, pendant ${SIGN_IN_MINUTES} minutes. Si tu n’as rien demandé, ignore cet e-mail.</p>
</div></body></html>`;
  return { to, subject, text, html };
}

export function resendMailer(apiKey: string, from: string, fetchFn: typeof fetch = fetch): Mailer {
  return async mail => {
    const response = await fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
    });
    if (!response.ok) throw new Error(`Resend ${response.status}`);
  };
}

/** Le moyen d'envoi selon l'environnement, ou null si la connexion doit rester fermée. */
export function mailerFromEnv(env: Record<string, string | undefined> = process.env): Mailer | null {
  if (env.RESEND_API_KEY && env.EMAIL_FROM) return resendMailer(env.RESEND_API_KEY, env.EMAIL_FROM);
  if (env.NODE_ENV === 'production') return null;
  return async mail => { console.info(`[koupi] e-mail pour ${mail.to} (pas d'envoi en local) : ${mail.text.split('\n').find(line => line.startsWith('http'))}`); };
}
