'use client';
import Link from '@/components/site/site-pages';
import { useRef } from 'react';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import { routes } from '@/lib/routes';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { Counter } from '@/components/site/counter';

// « Tu es créateur ? » : la seule section claire de la page. Tout le reste est la nuit du comptoir ;
// ici, la page devient un grand pass créateur en papier crème, barré d'un ruban corail qui défile.
// À droite, l'histoire d'un code en trois temps : la ligne perdue dans une description de vidéo,
// le coupon Merkod qui s'en détache, crédité au nom du créateur, et le compteur de copies du mois.
// Avec « réduire les animations », tout est déjà en place et le ruban ne défile pas.

export type CreatorStudioExample = { creator: string; creatorSlug: string; tool: string; code: string; discount: string };

const TAPE = ['Côté créateurs', 'Ton code', 'Ton nom', 'Tes chiffres', 'Ta commission'];

export function CreatorStudio({ id, example, copies, creators }: { id: string; example: CreatorStudioExample; copies: number; creators: number }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.k-studio-stage', start: 'top 72%', once: true } });
      tl.from('.k-studio-video', { y: 40, rotation: -4, autoAlpha: 0, duration: 0.7, ease: 'power3.out' })
        .fromTo('.k-studio-mark', { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: 0.5, ease: 'power2.inOut' })
        .from('.k-studio-pass', { y: -90, x: -40, rotation: -18, scale: 0.6, autoAlpha: 0, duration: 0.9, ease: 'back.out(1.8)' }, '+=0.1')
        .fromTo('.k-studio-stamp', { scale: 2.6, autoAlpha: 0, rotation: 6 }, { scale: 1, autoAlpha: 1, rotation: -9, duration: 0.45, ease: 'back.out(3)' })
        .from('.k-studio-bubble', { scale: 0, autoAlpha: 0, transformOrigin: '100% 100%', duration: 0.6, ease: 'elastic.out(1,0.55)' }, '-=0.1')
        .from('.k-studio-arrow', { autoAlpha: 0, x: -20, duration: 0.4, ease: 'power2.out' }, 0.9);
      gsap.from('.k-studio-perk', { y: 30, autoAlpha: 0, stagger: 0.1, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: '.k-studio-perks', start: 'top 85%', once: true } });
    });
  }, { scope: root });

  return (
    <section className="k-studio" id={id} ref={root} aria-labelledby="k-studio-title">
      <div className="k-studio-tape" aria-hidden="true">
        <div className="k-studio-tape-track">
          {[0, 1].map(copy => (
            <span key={copy}>{TAPE.map(word => <span key={word}>{word}<i>✦</i></span>)}</span>
          ))}
        </div>
      </div>

      <div className="k-wrap k-studio-in">
        <div className="k-studio-copy">
          <span className="k-studio-badge">Pass créateur · Gratuit</span>
          <h2 className="k-studio-title" id="k-studio-title">
            Ton code mérite mieux qu&apos;une ligne <span className="k-studio-title-hl">perdue</span> dans ta description.
          </h2>
          <p className="k-studio-lead">
            Tu donnes un code dans tes vidéos ? Il est peut-être déjà sur Merkod, crédité à ton nom, avec la vidéo d&apos;où il vient.
            Réclame ta page et regarde-le travailler pour toi.
          </p>

          <ol className="k-studio-perks">
            <li className="k-studio-perk">
              <span className="k-studio-perk-num" aria-hidden="true">01</span>
              <div><b>Ton code reste le tien</b><p>Ton lien est ouvert tel quel, sans suivi ajouté. La commission te revient, toujours.</p></div>
            </li>
            <li className="k-studio-perk">
              <span className="k-studio-perk-num" aria-hidden="true">02</span>
              <div><b>Tes copies, code par code</b><p>Chaque mois, combien de personnes ont copié chacun de tes codes.</p></div>
            </li>
            <li className="k-studio-perk">
              <span className="k-studio-perk-num" aria-hidden="true">03</span>
              <div><b>Une page vérifiée à ton nom</b><p>La coche « Créateur vérifié » et un lien unique à glisser dans tes descriptions.</p></div>
            </li>
          </ol>

          <div className="k-studio-actions">
            <Link className="k-studio-cta" href={routes.forCreators()}>
              <span className="k-studio-cta-main">Réclamer ma page</span>
              <span className="k-studio-cta-stub" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            </Link>
            <Link className="k-studio-link" href={routes.creator(example.creatorSlug)}>Voir la page de {example.creator}</Link>
          </div>
          <p className="k-studio-fine">Sans mot de passe, sans carte bancaire. Tu pars quand tu veux.</p>
        </div>

        <div className="k-studio-stage" aria-hidden="true">
          <div className="k-studio-video">
            <div className="k-studio-thumb">
              <span className="k-studio-play" />
              <span className="k-studio-time">12:48</span>
              <span className="k-studio-progress"><span /></span>
            </div>
            <div className="k-studio-meta">
              <CreatorAvatar name={example.creator} size="xs" />
              <div>
                <strong>Les outils que j&apos;utilise vraiment</strong>
                <span>{example.creator}</span>
              </div>
            </div>
            <div className="k-studio-desc">
              <span className="k-studio-line" />
              <span className="k-studio-line is-short" />
              <p>{example.discount} sur {example.tool} avec le code <span className="k-studio-mark">{example.code}</span></p>
              <span className="k-studio-line" />
              <span className="k-studio-more">…afficher plus</span>
            </div>
          </div>

          <svg className="k-studio-arrow" width="90" height="70" viewBox="0 0 90 70" fill="none">
            <path d="M8 8c10 30 34 46 66 50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 9" />
            <path d="M64 48l12 10-14 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div className="k-studio-pass">
            <div className="k-studio-pass-main">
              <small>Merkod · {example.tool}</small>
              <strong>{example.discount}</strong>
              <span className="k-studio-pass-code">{example.code}</span>
              <span className="k-studio-pass-by"><CreatorAvatar name={example.creator} size="xs" />{example.creator}</span>
            </div>
            <span className="k-studio-pass-stub">Copier</span>
            <span className="k-studio-stamp">Crédité à ton nom</span>
          </div>

          <div className="k-studio-bubble">
            {copies > 0 ? (
              <><b><Counter value={copies} group /></b><span>copies ce mois-ci, pour {creators} créateurs</span></>
            ) : (
              <><b><Counter value={creators} /></b><span>créateurs déjà crédités sur Merkod</span></>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
