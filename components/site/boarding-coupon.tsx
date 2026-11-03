'use client';
import Link from '@/components/site/site-pages';
import { useState } from 'react';
import type { Code } from '@/lib/data';
import { routes } from '@/lib/routes';
import { copyText, openCreatorLink } from '@/lib/copy';
import { track } from '@/lib/track';
import { playCouponSnip, playCouponTear } from '@/lib/coupon-sound';
import { ToolLogo } from '@/components/site/tool-logo';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { PlatformIcon } from '@/components/platform-icon';
import { codeBadge } from '@/lib/code-badge';
import { TrustGlyph } from '@/components/site/trust';
import { PLATFORM_LABELS } from '@/lib/creator-accounts-display';
import { sourcePlatform } from '@/lib/source-platform';
import { sourceLabel } from '@/lib/source-label';
import { CodeThumbs } from '@/components/site/code-thumbs';
import { CreatorMark } from '@/components/site/creator-mark';
import { CODE_COPIED_EVENT, type CopiedCode } from '@/lib/vote-invite';

// Le coupon du site : un seul modèle pour tous les codes (accueil, catégories, page Codes, créateurs, autres codes d'un outil).
// Posé debout (talon en bas) dans une grille `.k-pass-grid`, couché (talon à droite) dans une liste `.k-pass-rows`. Même papier et même talon bleu, avec le créateur et les infos utiles (réduction, réussite, votes, date). Un clic sur le talon le détache
// (bruit de déchirure), copie le code et ouvre le lien du créateur.
// « Ça a marché ? » se vote avec les pouces à droite du nom de l'outil : 👍 avec le nombre de votes positifs, 👎 à côté.
// Le pouce choisi reste coloré ; un vote tout juste donné ajoute +1 au compteur.
// La confiance tient dans une pastille posée sur le logo (coche verte « Vérifié », coche dorée
// « Testé au paiement », sablier « À tester », point d'exclamation « Peut-être expiré ») ; à la place de l'ancien
// badge, le logo de la plateforme d'où vient le code (YouTube, Instagram, TikTok, podcast…).

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/** Date courte en français, calculée sans fuseau pour que le serveur et le navigateur affichent la même chose. */
function shortDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return year && month && day ? `${day} ${MONTHS[month - 1]} ${year}` : '';
}

/**
 * compact : carte de la page créateur, mêmes infos que la vue liste plus les pouces (sans « Donné par » ni réussite, votes et date).
 * light : version allégée de l'accueil (logo et sceau, outil, créateur, réduction, talon), sans votes, chiffres ni source.
 * linkTool : le papier du coupon (nom de l'outil compris) mène à sa fiche, sauf sur la fiche elle-même.
 */
type Props = { code: Code; category?: string; link: string; compact?: boolean; light?: boolean; linkTool?: boolean };

export function BoardingCoupon({ code, category, link, compact = false, light = false, linkTool = true }: Props) {
  const [torn, setTorn] = useState(false);
  const [failed, setFailed] = useState(false);
  const badge = codeBadge(code, { withDate: false });
  const platform = sourcePlatform(code.source);

  const tear = async () => {
    track('copy', code.id);
    if (torn) {
      playCouponSnip();
      setFailed(!(await copyText(code.code)));
      return;
    }
    const copying = copyText(code.code);
    playCouponTear();
    // Prévient la fenêtre « Laisse un 👍 » : elle s'ouvrira au retour du visiteur.
    window.dispatchEvent(new CustomEvent<CopiedCode>(CODE_COPIED_EVENT, { detail: { id: code.id, code: code.code, tool: code.tool, creator: code.creator } }));
    setTorn(true);
    setFailed(!(await copying));
    window.setTimeout(() => { if (link && link !== '#') track('open', code.id); openCreatorLink(link); }, 850);
  };

  return (
    <article className={`k-pass${torn ? ' is-torn' : ''}${compact ? ' is-compact' : ''}${light ? ' is-light' : ''}`} data-code-id={code.id}>
      <div className="k-pass-main k-paper">
        <header className="k-pass-head">
          <span className="k-pass-logo">
            <ToolLogo tool={code.toolSlug} name={code.tool} />
            <span className={`k-codeseal is-${badge.seal}`} title={badge.title}>
              <TrustGlyph seal={badge.seal} />
              <span className="k-sr">{badge.label}</span>
            </span>
          </span>
          <span className="k-pass-title">
            {linkTool && code.toolSlug
              ? <Link href={routes.tool(code.toolSlug)} className="k-pass-tool" aria-label={`Voir la fiche ${code.tool}`}><strong>{code.tool}</strong></Link>
              : <strong>{code.tool}</strong>}
            {light
              ? <small className="k-pass-light-by">par {code.creator}<CreatorMark level={code.creatorLevel} compact /></small>
              : category && <small>{category}</small>}
          </span>
          {!light && <CodeThumbs code={code} />}
        </header>

        {compact || light
          ? <p className="k-pass-discount">{code.discount}</p>
          : <>
        <p className="k-pass-by">
          <span className="k-pass-by-top">
            <small>Donné par</small>
            {platform && platform !== 'other' && (
              <span className="k-pass-platform"><PlatformIcon platform={platform} size={16} className="k-platform-icon" />{PLATFORM_LABELS[platform]}</span>
            )}
          </span>
          <Link href={routes.creator(code.creatorSlug)} className="k-pass-who"><CreatorAvatar name={code.creator} size="xs" /><span className="k-pass-who-name">{code.creator}</span><CreatorMark level={code.creatorLevel} compact /></Link>
        </p>

        <dl className="k-pass-facts">
          <div className="is-wide"><dt>Réduction</dt><dd className="is-discount">{code.discount}</dd></div>
          <div><dt>Réussite</dt><dd>{code.votes > 0 ? `${code.success} %` : '—'}</dd></div>
          <div><dt>Votes</dt><dd>{code.votes}</dd></div>
          {code.expiresOn
            ? <div><dt>Expire</dt><dd>{shortDate(code.expiresOn)}</dd></div>
            : <div><dt>Ajouté</dt><dd>{shortDate(code.createdAt)}</dd></div>}
        </dl>
          </>}

        {!light && code.source && (
          <a className="k-pass-source" href={code.source} target="_blank" rel="noopener noreferrer" title={code.sourceTitle || undefined}>
            {platform === 'youtube'
              ? <svg className="k-pass-source-yt" width="20" height="14" viewBox="0 0 20 14" aria-hidden="true"><rect width="20" height="14" rx="4" fill="#FF0000" /><path d="M8 4v6l5.2-3z" fill="#fff" /></svg>
              : platform && platform !== 'other'
              ? <PlatformIcon platform={platform} size={16} className="k-platform-icon" />
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" /></svg>}
            <span>{sourceLabel(code) || 'Voir la source'}</span>
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
