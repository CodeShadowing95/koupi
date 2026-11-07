'use client';
import Link from '@/components/site/site-pages';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { routes } from '@/lib/routes';
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { drawOrbit, ORBIT_EXAMPLES, ORBIT_SHUFFLE_MS, ORBIT_SLOTS } from '@/lib/creator-orbit';

// « Ils ont donné le code » : les créateurs tournent en orbite autour d'un coupon.
// La rotation accélère quand on fait défiler la page vite ; chaque avatar reste droit.
// Toutes les 30 secondes, les avatars s'effacent (zoom arrière) et un autre tirage apparaît (zoom avant).
// La liste de gauche ne montre que des exemples inventés : un vrai créateur à côté d'un code expiré
// laisserait croire que ce code marche encore.
// Avec « réduire les animations », l'orbite reste immobile et ne change pas de créateurs.

export type OrbitCreator = { name: string; slug: string };

export function CreatorsOrbit({ id, creators, total }: { id?: string; creators: OrbitCreator[]; total: number }) {
  const root = useRef<HTMLElement>(null);
  // Premier tirage identique côté serveur et navigateur ; les suivants sont aléatoires.
  const [shown, setShown] = useState(() => creators.slice(0, ORBIT_SLOTS));
  const swapped = useRef(false);

  useEffect(() => {
    if (!window.matchMedia(MOTION_OK).matches) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const items = root.current?.querySelectorAll('.k-orbit-item .k-av');
      if (!items?.length) return;
      gsap.to(items, {
        scale: 0, autoAlpha: 0, duration: 0.5, ease: 'power2.in', stagger: { each: 0.04, from: 'random' },
        onComplete: () => { swapped.current = true; setShown(current => drawOrbit(creators, ORBIT_SLOTS, current)); },
      });
    }, ORBIT_SHUFFLE_MS);
    return () => window.clearInterval(timer);
  }, [creators]);

  // Après un nouveau tirage, les avatars réapparaissent en zoom avant (avant l'affichage, sans clignement).
  useLayoutEffect(() => {
    if (!swapped.current) return;
    const items = root.current?.querySelectorAll('.k-orbit-item .k-av');
    if (items?.length) gsap.fromTo(items, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.7, ease: 'back.out(1.8)', stagger: { each: 0.05, from: 'random' } });
  }, [shown]);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const orbit = gsap.to('.k-orbit-ring', { rotation: 360, duration: 60, ease: 'none', repeat: -1 });
      const counter = gsap.to('.k-orbit-item > a', { rotation: -360, duration: 60, ease: 'none', repeat: -1 });
      ScrollTrigger.create({
        trigger: '.k-orbit',
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: self => {
          const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 120, 14);
          [orbit, counter].forEach(tween => gsap.to(tween, { timeScale: boost, duration: 0.25, overwrite: true, onComplete: () => { gsap.to(tween, { timeScale: 1, duration: 1.4 }); } }));
        },
      });
      gsap.from('.k-orbit-item', { scale: 0, autoAlpha: 0, stagger: 0.06, duration: 0.9, ease: 'back.out(2)', scrollTrigger: { trigger: '.k-orbit', start: 'top 70%' } });
      gsap.from('.k-orbit-core', { scale: 0.4, rotation: -30, autoAlpha: 0, duration: 1.2, ease: 'elastic.out(1,0.6)', scrollTrigger: { trigger: '.k-orbit', start: 'top 65%' } });
    });
  }, { scope: root });

  if (creators.length === 0) return null;

  return (
    <section className="k-section k-orbit-wrap" id={id} ref={root} aria-labelledby="k-orbit-title">
      <div className="k-wrap k-orbit-grid">
        <div className="k-orbit-copy" data-reveal>
          <span className="k-eyebrow">Ils ont donné le code</span>
          <h2 id="k-orbit-title">Des créateurs,<br /><span className="k-grad">pas des robots.</span></h2>
          <p>Chaque code vient d&apos;une vraie vidéo, d&apos;un vrai podcast ou d&apos;un vrai post. On te dit qui l&apos;a donné, où, et on te renvoie vers lui. Clique sur un visage pour voir tous ses codes.</p>
          <ul className="k-orbit-list" aria-label="Exemples">
            {ORBIT_EXAMPLES.map(example => (
              <li key={example.name}>
                <CreatorAvatar name={example.name} size="xs" />
                <strong>{example.name}</strong>
                <span>{example.what} · {example.discount}</span>
              </li>
            ))}
          </ul>
          <small className="k-orbit-note">Exemples pour illustrer. Les vrais codes, vérifiés et datés, sont sur la page Explorer.</small>
        </div>
        <div className="k-orbit" aria-hidden="true">
          <div className="k-orbit-track k-orbit-track-out" />
          <div className="k-orbit-track k-orbit-track-in" />
          <div className="k-orbit-ring">
            {/* Une place par index : les éléments restent les mêmes d'un tirage à l'autre, seule la personne change. */}
            {shown.map((person, i) => (
              <span className="k-orbit-item" key={i} style={{ ['--a' as string]: `${(360 / shown.length) * i}deg`, ['--d' as string]: i % 2 ? 'var(--orbit-in)' : 'var(--orbit-out)' }}>
                <Link href={routes.creator(person.slug)} tabIndex={-1} title={`Les codes de ${person.name}`}>
                  <CreatorAvatar name={person.name} />
                </Link>
              </span>
            ))}
          </div>
          <div className="k-orbit-core">
            <span className="k-orbit-brand">MERKOD</span>
            <strong>{total}</strong>
            <span>{total > 1 ? 'créateurs crédités' : 'créateur crédité'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
