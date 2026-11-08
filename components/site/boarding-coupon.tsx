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
import { codeBadge } from '@/lib/code-badge';
import { TrustGlyph } from '@/components/site/trust';
import { sourcePlatform } from '@/lib/source-platform';
import { CodeThumbs } from '@/components/site/code-thumbs';
import { CodeMenu } from '@/components/site/code-menu';
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
 * votes : ajoute les pouces à la version allégée, à droite de la réduction (rangées de la page Codes).
 * linkTool : le papier du coupon (nom de l'outil compris) mène à sa fiche, sauf sur la fiche elle-même.
 */
type Props = { code: Code; category?: string; link: string; compact?: boolean; light?: boolean; votes?: boolean; linkTool?: boolean };

export function BoardingCoupon({ code, category, link, compact = false, light = false, votes = false, linkTool = true }: Props) {
  const [torn, setTorn] = useState(false);
  const [failed, setFailed] = useState(false);
  const badge = codeBadge(code, { withDate: false });
  const platform = sourcePlatform(code.source);
  // Code + lien du créateur : la copie ouvre son lien d'affiliation, on le dit sur le talon (ADR-0040).
  const viaCreator = Boolean(code.creatorLink && link === code.creatorLink);

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
              : compact
              ? category && <small>{category}</small>
              // Mode détaillé : un mot de confiance court à la place de la catégorie (la pastille du logo porte le dessin).
              : <small className={`k-pass-trust is-${badge.seal}`} title={badge.title}>{badge.label}</small>}
          </span>
          {!light && (
            <span className="k-pass-actions">
              <CodeThumbs code={code} />
              <CodeMenu code={code} platform={platform} linkTool={linkTool} />
            </span>
          )}
        </header>

        {light && votes
          ? <div className="k-pass-light-foot"><p className="k-pass-discount">{code.discount}</p><CodeThumbs code={code} /></div>
          : compact || light
          ? <p className="k-pass-discount">{code.discount}</p>
          : <>
        {/* Le créateur seul (avatar et nom) : la source, le partage et le signalement sont dans le menu ⋮. */}
        <p className="k-pass-by">
          <Link href={routes.creator(code.creatorSlug)} className="k-pass-who"><CreatorAvatar name={code.creator} size="xs" /><span className="k-pass-who-name">{code.creator}</span><CreatorMark level={code.creatorLevel} compact /></Link>
        </p>

        {/* Une seule information mise en avant : la réduction. La date de fin s'affiche seulement si elle existe. */}
        <p className="k-pass-offer">
          <span className="k-pass-discount is-detail">{code.discount}</span>
          {code.expiresOn && <small className="k-pass-expiry">Jusqu’au {shortDate(code.expiresOn)}</small>}
        </p>
          </>}
      </div>

      {!code.code ? (
        // Offre sans code (ADR-0040) : le talon ouvre le lien d'affiliation du créateur, marqué comme tel.
        <a className="k-pass-stub is-link" href={link} target="_blank" rel="sponsored noopener noreferrer" onClick={() => track('open', code.id)}
          aria-label={`Profiter de l’offre ${code.tool} avec le lien de ${code.creator} (lien d’affiliation)`}>
          <span className="k-pass-stub-code">
            <small>Sans code · lien d’affiliation</small>
            <span className="k-pass-code is-link">Lien du créateur</span>
          </span>
          <span className="k-pass-action">Profiter de l’offre</span>
        </a>
      ) : <>
      <button type="button" className="k-pass-stub" onClick={tear}
        aria-label={torn ? `Recopier le code ${code.code}` : viaCreator ? `Copier le code ${code.code} et ouvrir ${code.tool} via le lien de ${code.creator} (lien d’affiliation)` : `Copier le code ${code.code} et ouvrir ${code.tool}`}>
        <span className="k-pass-stub-code">
          <small>{torn ? (failed ? 'Copie à la main' : 'Copié ✓') : <>Code promo{viaCreator && <svg className="k-pass-stub-link" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>}</>}</small>
          <span className="k-pass-code">{code.code}</span>
        </span>
        <span className="k-pass-action">{torn ? 'Recopier' : 'Copier'}</span>
      </button>
      <span className="k-sr" role="status">{torn ? (failed ? `Copie le code ${code.code} à la main` : `Code ${code.code} copié`) : ''}</span>
      </>}
    </article>
  );
}
