'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { Code } from '@/lib/data';
import { routes } from '@/lib/routes';
import { copyText, openCreatorLink } from '@/lib/copy';
import { track } from '@/lib/track';
import { playCouponSnip, playCouponTear } from '@/lib/coupon-sound';
import { ToolLogo } from '@/components/site/tool-logo';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { CodeBadge } from '@/components/site/code-badge';
import { useCodeVote } from '@/components/site/use-code-vote';

// Le coupon de la page « Tous les codes » : même papier et même talon bleu que sur l'accueil,
// posé debout (talon en bas) pour tenir à trois par ligne, avec le créateur et les infos utiles (réduction, réussite, votes, date). Un clic sur le talon le détache
// (bruit de déchirure), copie le code et ouvre le lien du créateur.
// « Ça a marché ? » se vote avec les pouces à droite du nom de l'outil : 👍 avec le nombre de votes positifs, 👎 à côté.
// Le pouce choisi reste coloré ; un vote tout juste donné ajoute +1 au compteur.

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/** Date courte en français, calculée sans fuseau pour que le serveur et le navigateur affichent la même chose. */
function shortDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return year && month && day ? `${day} ${MONTHS[month - 1]} ${year}` : '';
}

type Props = { code: Code; category?: string; link: string };

export function BoardingCoupon({ code, category, link }: Props) {
  const [torn, setTorn] = useState(false);
  const [failed, setFailed] = useState(false);
  const { voted, fresh, message, sending, vote } = useCodeVote(code.id);
  // Votes positifs déjà comptés (taux de réussite × votes), plus le vôtre s'il vient d'être donné.
  const ups = Math.round((code.votes * code.success) / 100) + (voted === 'up' && fresh ? 1 : 0);

  const tear = async () => {
    track('copy', code.id);
    if (torn) {
      playCouponSnip();
      setFailed(!(await copyText(code.code)));
      return;
    }
    const copying = copyText(code.code);
    playCouponTear();
    setTorn(true);
    setFailed(!(await copying));
    window.setTimeout(() => { if (link && link !== '#') track('open', code.id); openCreatorLink(link); }, 850);
  };

  return (
    <article className={`k-pass${torn ? ' is-torn' : ''}`}>
      <div className="k-pass-main k-paper">
        <header className="k-pass-head">
          <ToolLogo tool={code.toolSlug} name={code.tool} />
          <span className="k-pass-title">
            <strong>{code.tool}</strong>
            {category && <small>{category}</small>}
          </span>
          <div className="k-pass-thumbs" role="group" aria-label={`Le code ${code.code} a-t-il marché ?`}>
            <button type="button" className={`is-up${voted === 'up' && fresh ? ' is-new' : ''}${sending ? ' is-sending' : ''}`} aria-pressed={voted === 'up'}
              disabled={sending || voted !== null} onClick={() => vote(true)}
              title={voted ? `${ups} ${ups > 1 ? 'personnes disent' : 'personne dit'} que ce code marche` : 'Ce code a marché'}
              aria-label={`Ce code a marché (${ups} ${ups > 1 ? 'votes' : 'vote'})`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3Zm0 0 4-7a2.5 2.5 0 0 1 2.5 3L13 10h5.5a2 2 0 0 1 2 2.4l-1.5 7A2 2 0 0 1 17 21H7" /></svg>
              {ups}
            </button>
            <button type="button" className={`is-down${voted === 'down' && fresh ? ' is-new' : ''}`} aria-pressed={voted === 'down'}
              disabled={sending || voted !== null} onClick={() => vote(false)}
              title={voted ? 'Ton vote est enregistré' : 'Ce code n’a pas marché'} aria-label="Ce code n’a pas marché">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><path d="M17 14V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-3Zm0 0-4 7a2.5 2.5 0 0 1-2.5-3L11 14H5.5a2 2 0 0 1-2-2.4l1.5-7A2 2 0 0 1 7 3h10" /></svg>
            </button>
            {voted ? <span className="k-sr" role="status">{message}</span> : message && <span className="k-pass-thumbs-error" role="alert">{message}</span>}
          </div>
        </header>

        <p className="k-pass-by">
          <span className="k-pass-by-top"><small>Donné par</small><CodeBadge code={code} withDate={false} /></span>
          <Link href={routes.creator(code.creatorSlug)} className="k-pass-who"><CreatorAvatar name={code.creator} size="xs" /><span className="k-pass-who-name">{code.creator}</span></Link>
        </p>

        <dl className="k-pass-facts">
          <div className="is-wide"><dt>Réduction</dt><dd className="is-discount">{code.discount}</dd></div>
          <div><dt>Réussite</dt><dd>{code.votes > 0 ? `${code.success} %` : '—'}</dd></div>
          <div><dt>Votes</dt><dd>{code.votes}</dd></div>
          {code.expiresOn
            ? <div><dt>Expire</dt><dd>{shortDate(code.expiresOn)}</dd></div>
            : <div><dt>Ajouté</dt><dd>{shortDate(code.createdAt)}</dd></div>}
        </dl>

        {code.source && (
          <a className="k-pass-source" href={code.source} target="_blank" rel="noopener noreferrer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            <span>{code.sourceTitle || 'Voir la source'}</span>
          </a>
        )}
      </div>

      <button type="button" className="k-pass-stub" onClick={tear} aria-label={torn ? `Recopier le code ${code.code}` : `Copier le code ${code.code} et ouvrir ${code.tool}`}>
        <span className="k-pass-stub-code">
          <small>{torn ? (failed ? 'Copie à la main' : 'Copié ✓') : 'Code promo'}</small>
          <span className="k-pass-code">{code.code}</span>
        </span>
        <span className="k-pass-action">{torn ? 'Recopier' : 'Copier'}</span>
      </button>
      <span className="k-sr" role="status">{torn ? (failed ? `Copie le code ${code.code} à la main` : `Code ${code.code} copié`) : ''}</span>
    </article>
  );
}
