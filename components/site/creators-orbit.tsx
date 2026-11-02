'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { routes } from '@/lib/routes';
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { CreatorAvatar } from '@/components/site/creator-avatar';

// « Ils ont donné le code » : les créateurs tournent en orbite autour d'un coupon.
// La rotation accélère quand on fait défiler la page vite ; chaque avatar reste droit.
// Avec « réduire les animations », l'orbite reste immobile.

export type OrbitCreator = { name: string; slug: string; codes: number; tool: string; discount: string };

export function CreatorsOrbit({ creators, total }: { creators: OrbitCreator[]; total: number }) {
  const root = useRef<HTMLElement>(null);

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
    <section className="k-section k-orbit-wrap" ref={root} aria-labelledby="k-orbit-title">
      <div className="k-wrap k-orbit-grid">
        <div className="k-orbit-copy" data-reveal>
          <span className="k-eyebrow">Ils ont donné le code</span>
          <h2 id="k-orbit-title">Des créateurs,<br /><span className="k-grad">pas des robots.</span></h2>
          <p>Chaque code vient d&apos;une vraie vidéo, d&apos;un vrai podcast ou d&apos;un vrai post. On te dit qui l&apos;a donné, où, et on te renvoie vers lui. Clique sur un visage pour voir tous ses codes.</p>
          <ul className="k-orbit-list">
            {creators.slice(0, 4).map(person => (
              <li key={person.slug}>
                <Link href={routes.creator(person.slug)}>
                  <CreatorAvatar name={person.name} size="xs" />
                  <strong>{person.name}</strong>
                  <span>{person.tool} · {person.discount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="k-orbit" aria-hidden="true">
          <div className="k-orbit-track k-orbit-track-out" />
          <div className="k-orbit-track k-orbit-track-in" />
          <div className="k-orbit-ring">
            {creators.map((person, i) => (
              <span className="k-orbit-item" key={person.slug} style={{ ['--a' as string]: `${(360 / creators.length) * i}deg`, ['--d' as string]: i % 2 ? 'var(--orbit-in)' : 'var(--orbit-out)' }}>
                <Link href={routes.creator(person.slug)} tabIndex={-1} title={`Les codes de ${person.name}`}>
                  <CreatorAvatar name={person.name} />
                  <small>{person.codes} {person.codes > 1 ? 'codes' : 'code'}</small>
                </Link>
              </span>
            ))}
          </div>
          <div className="k-orbit-core">
            <span className="k-orbit-brand">KOUPI</span>
            <strong>{total}</strong>
            <span>{total > 1 ? 'créateurs crédités' : 'créateur crédité'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
