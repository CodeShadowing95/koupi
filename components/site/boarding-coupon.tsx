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

// Le coupon de la page « Tous les codes », façon carte d'embarquement :
// même papier et même talon bleu que sur l'accueil, avec le trajet « donné par → valable sur »
// et les infos utiles (réduction, réussite, votes, date). Un clic sur le talon le détache
// (bruit de déchirure), copie le code et ouvre le lien du créateur.

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
          <CodeBadge code={code} />
        </header>

        <div className="k-pass-route">
          <span className="k-pass-end">
            <small>Donné par</small>
            <Link href={routes.creator(code.creatorSlug)} className="k-pass-who"><CreatorAvatar name={code.creator} size="xs" />{code.creator}</Link>
          </span>
          <span className="k-pass-path" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9a3 3 0 0 0 0 6v3h18v-3a3 3 0 0 1 0-6V6H3z" /><path d="M14 6v12" strokeDasharray="2 2.5" /></svg>
          </span>
          <span className="k-pass-end is-right">
            <small>Valable sur</small>
            <Link href={routes.tool(code.toolSlug)} className="k-pass-who">{code.tool}</Link>
          </span>
        </div>

        <dl className="k-pass-facts">
          <div className="is-wide"><dt>Réduction</dt><dd className="is-discount">{code.discount}</dd></div>
          <div><dt>Réussite</dt><dd>{code.votes > 0 ? `${code.success} %` : '—'}</dd></div>
          <div><dt>Votes</dt><dd>{code.votes}</dd></div>
          <div><dt>Ajouté</dt><dd>{shortDate(code.createdAt)}</dd></div>
        </dl>

        {code.source && (
          <a className="k-pass-source" href={code.source} target="_blank" rel="noopener noreferrer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            <span>{code.sourceTitle || 'Voir la source'}</span>
          </a>
        )}
      </div>

      <button type="button" className="k-pass-stub" onClick={tear} aria-label={torn ? `Recopier le code ${code.code}` : `Détacher le coupon : copie le code ${code.code} et ouvre ${code.tool}`}>
        <small>{torn ? (failed ? 'Copie à la main' : 'Copié ✓') : 'Code promo'}</small>
        <span className="k-pass-code">{code.code}</span>
        <span className="k-pass-barcode" aria-hidden="true" />
        <span className="k-pass-action">{torn ? 'Recopier' : 'Détacher'}</span>
      </button>
      <span className="k-sr" role="status">{torn ? (failed ? `Copie le code ${code.code} à la main` : `Code ${code.code} copié`) : ''}</span>
    </article>
  );
}
