// E-mails envoyés aux créateurs (ADR-0021). Envoi par l'API HTTP de Resend, sans dépendance :
// RESEND_API_KEY et EMAIL_FROM (adresse d'un domaine vérifié chez Resend) suffisent.
// Sans eux : en local, le lien s'affiche dans la console ; en production, la connexion reste fermée.
import { SIGN_IN_MINUTES } from './creator-auth';
import { withTimeout } from './timeout-fetch';

export type Mail = { to: string; subject: string; text: string; html: string; headers?: Record<string, string> };
export type Mailer = (mail: Mail) => Promise<void>;

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

const parisTime = (now: Date) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(now);
const parisDay = (now: Date) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' }).format(now);

/**
 * Le message de connexion : court, un seul bouton, lisible même sans HTML.
 * Chaque envoi a son heure dans l'objet et le texte, et un identifiant à part : sans ça, Gmail range les
 * demandes dans une même conversation et cache le contenu identique des suivants (« ••• »), et on
 * clique sur le premier lien, déjà utilisé.
 */
export function signInMail(to: string, link: string, creatorName: string | null, now = new Date(), id: string = crypto.randomUUID()): Mail {
  const time = parisTime(now);
  const subject = `${creatorName ? `Ton accès à la page ${creatorName} sur Merkod` : 'Ton lien de connexion à Merkod'} (${time})`;
  const asked = `Demandé le ${parisDay(now)} à ${time}.`;
  const lead = creatorName
    ? `Voici ton lien pour entrer dans ton espace et suivre les copies de tes codes sur la page ${creatorName}.`
    : 'Voici ton lien pour entrer dans ton espace créateur Merkod.';
  const text = [
    'Bonjour,', '', lead, asked, '', link, '',
    `Le lien marche une seule fois, pendant ${SIGN_IN_MINUTES} minutes. Si tu n’as rien demandé, ignore cet e-mail.`, '', 'L’équipe Merkod',
  ].join('\n');
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:32px 16px;background:#F6F4EE;font-family:Arial,Helvetica,sans-serif;color:#14142B">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
<p style="margin:0 0 8px;font-size:22px;font-weight:800">Merkod</p>
<p style="font-size:16px;line-height:1.5">${escape(lead)}</p>
<p style="margin:0;font-size:13px;color:#5B5B73">${escape(asked)}</p>
<p style="margin:28px 0"><a href="${escape(link)}" style="display:inline-block;background:#2A3BD6;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px">Entrer dans mon espace</a></p>
<p style="font-size:13px;color:#5B5B73;line-height:1.5">Le lien marche une seule fois, pendant ${SIGN_IN_MINUTES} minutes. Si tu n’as rien demandé, ignore cet e-mail.</p>
</div></body></html>`;
  return { to, subject, text, html, headers: { 'X-Entity-Ref-ID': id } };
}

/**
 * Invitation à relier sa vraie page (ADR-0044), envoyée par l'admin d'un clic, jamais automatiquement :
 * le créateur a ouvert son studio sur une page provisoire alors qu'une page à son nom existe déjà.
 */
export function linkInviteMail(to: string, provisionalName: string, realName: string, link: string, now = new Date(), id: string = crypto.randomUUID()): Mail {
  const subject = `Ta page ${realName} t’attend sur Merkod (${parisTime(now)})`;
  const lead = `Tu as ouvert ton studio Merkod sous le nom « ${provisionalName} ». Il existe déjà une page ${realName} sur Merkod, avec ses codes : si c’est toi, relie-la à ton studio.`;
  const how = 'Dans ton studio, clique « C’est moi, relier cette page », puis prouve ta chaîne en mettant ton code Merkod dans ta bio. Tes codes et ta page provisoire passent alors sur ta vraie page.';
  const text = ['Bonjour,', '', lead, '', how, '', link, '', 'Si ce n’est pas toi, ignore cet e-mail : rien ne change.', '', 'L’équipe Merkod'].join('\n');
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:32px 16px;background:#F6F4EE;font-family:Arial,Helvetica,sans-serif;color:#14142B">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
<p style="margin:0 0 8px;font-size:22px;font-weight:800">Merkod</p>
<p style="font-size:16px;line-height:1.5">${escape(lead)}</p>
<p style="font-size:14px;line-height:1.5;color:#5B5B73">${escape(how)}</p>
<p style="margin:28px 0"><a href="${escape(link)}" style="display:inline-block;background:#2A3BD6;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px">Ouvrir mon studio</a></p>
<p style="font-size:13px;color:#5B5B73;line-height:1.5">Si ce n’est pas toi, ignore cet e-mail : rien ne change.</p>
</div></body></html>`;
  return { to, subject, text, html, headers: { 'X-Entity-Ref-ID': id } };
}

export function resendMailer(apiKey: string, from: string, fetchFn: typeof fetch = withTimeout()): Mailer {
  return async mail => {
    const response = await fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html, ...(mail.headers ? { headers: mail.headers } : {}) }),
    });
    if (!response.ok) throw new Error(`Resend ${response.status}`);
  };
}

/** Le moyen d'envoi selon l'environnement, ou null si la connexion doit rester fermée. */
export function mailerFromEnv(env: Record<string, string | undefined> = process.env): Mailer | null {
  if (env.RESEND_API_KEY && env.EMAIL_FROM) return resendMailer(env.RESEND_API_KEY, env.EMAIL_FROM);
  if (env.NODE_ENV === 'production') return null;
  return async mail => { console.info(`[merkod] e-mail pour ${mail.to} (pas d'envoi en local) : ${mail.text.split('\n').find(line => line.startsWith('http'))}`); };
}
