'use client';
import { useRef } from 'react';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import { CreatorAvatar } from '@/components/site/creator-avatar';

// « Comment ça marche » : la section défile à l'horizontale pendant qu'on descend (ScrollTrigger épinglé).
// Une ligne corail se dessine d'une étape à l'autre (DrawSVG), la recherche s'écrit toute seule,
// le talon du coupon se détache au rythme du défilement et la commission monte vers le créateur.
// Avec « réduire les animations », les étapes s'empilent simplement, sans mouvement.

export type HowItWorksExample = {
  tool: string;
  code: string;
  discount: string;
  creator: string;
};

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);

export function HowItWorks({ example }: { example?: HowItWorksExample }) {
  const root = useRef<HTMLElement>(null);
  const tool = example?.tool ?? 'NordVPN';
  const code = example?.code ?? 'KOUPI';
  const discount = example?.discount ?? '−20 %';

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const section = root.current;
      const track = section?.querySelector<HTMLElement>('.k-journey-track');
      if (!section || !track) return;
      const distance = () => track.scrollWidth - window.innerWidth;
      const pin = { trigger: section, start: 'top top', end: () => `+=${distance()}`, scrub: 1, invalidateOnRefresh: true };

      const slide = gsap.to(track, { x: () => -distance(), ease: 'none', scrollTrigger: { ...pin, pin: true } });

      // La ligne part de l'étape 1 et sa pointe reste à 60 % de la largeur de l'écran : elle avance au même rythme
      // que le défilement, sans jamais prendre d'avance sur l'étape suivante.
      gsap.fromTo('.k-journey-line', { drawSVG: '0%' }, {
        drawSVG: '100%', ease: 'none',
        scrollTrigger: { trigger: '.k-journey-svg', containerAnimation: slide, start: 'left 60%', end: 'right 60%', scrub: true },
      });
      gsap.from('.k-journey-step-0 .k-journey-copy > *', { y: 60, autoAlpha: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: section, start: 'top 75%' } });
      gsap.utils.toArray<HTMLElement>('.k-journey-step:not(.k-journey-step-0)').forEach(step => {
        gsap.from(step.querySelectorAll('.k-journey-num, .k-journey-copy > *'), {
          y: 80, autoAlpha: 0, rotation: 4, stagger: 0.08, duration: 0.9, ease: 'back.out(1.6)',
          scrollTrigger: { trigger: step, containerAnimation: slide, start: 'left 75%', toggleActions: 'play none none reverse' },
        });
      });
      // Étape 1 : la recherche s'écrit toute seule.
      gsap.to('.k-journey-typed', {
        duration: 1.2,
        scrambleText: { text: tool, chars: 'lowerCase', revealDelay: 0.2, speed: 0.5 },
        scrollTrigger: { trigger: '.k-journey-step-1', containerAnimation: slide, start: 'left 60%', toggleActions: 'play none none reverse' },
      });
      // Étape 2 : le talon se détache au rythme du défilement, puis le tampon tombe.
      gsap.timeline({ scrollTrigger: { trigger: '.k-journey-step-2', containerAnimation: slide, start: 'left 55%', end: 'center 40%', scrub: 1 } })
        .to('.k-journey-stub', { rotation: 24, x: 70, y: 150, ease: 'power2.in' })
        .fromTo('.k-journey-stamp', { scale: 2.6, autoAlpha: 0, rotation: -2 }, { scale: 1, autoAlpha: 1, rotation: -12, ease: 'back.out(3)' }, 0.35);
      // Étape 3 : la commission monte vers le créateur.
      gsap.from('.k-journey-coin', {
        y: 160, autoAlpha: 0, scale: 0.4, stagger: 0.12, duration: 0.9, ease: 'back.out(2)',
        scrollTrigger: { trigger: '.k-journey-step-3', containerAnimation: slide, start: 'left 60%', toggleActions: 'play none none reverse' },
      });
    });
  }, { scope: root, dependencies: [tool] });

  return (
    <section className="k-journey" ref={root} aria-labelledby="k-journey-title">
      <div className="k-journey-track">
        <svg className="k-journey-svg" viewBox="0 0 3000 200" preserveAspectRatio="none" aria-hidden="true">
          <path className="k-journey-line" d="M0,120 C300,20 600,200 1000,110 S1700,10 2000,120 S2700,200 3000,90" />
        </svg>
        <div className="k-journey-step k-journey-step-0">
          <div className="k-journey-copy">
            <span className="k-eyebrow">Comment ça marche</span>
            <h2 id="k-journey-title">Trois gestes,<br /><span className="k-grad">zéro code mort.</span></h2>
            <p>On ne t&apos;envoie pas sur un site rempli de faux boutons. Tu trouves, tu détaches, le créateur est payé.</p>
          </div>
        </div>
        <div className="k-journey-step k-journey-step-1">
          <span className="k-journey-num" aria-hidden="true">01</span>
          <div className="k-journey-copy">
            <h3>Cherche ton outil</h3>
            <p>Tape son nom. On te montre le code donné par un créateur, la vidéo d&apos;où il vient et la date de vérification.</p>
            <div className="k-journey-search" aria-hidden="true"><SearchIcon /><span className="k-journey-typed">{tool}</span><i /></div>
          </div>
        </div>
        <div className="k-journey-step k-journey-step-2">
          <span className="k-journey-num" aria-hidden="true">02</span>
          <div className="k-journey-copy">
            <h3>Détache le coupon</h3>
            <p>Un geste : le code est copié, et le site s&apos;ouvre avec le lien du créateur, tel quel.</p>
            <div className="k-journey-coupon" aria-hidden="true">
              <div className="k-journey-main"><span>{tool}</span><strong>{discount}</strong><span className="k-journey-stamp">Copié !</span></div>
              <div className="k-journey-stub"><span>CODE</span><strong className="k-mono">{code}</strong></div>
            </div>
          </div>
        </div>
        <div className="k-journey-step k-journey-step-3">
          <span className="k-journey-num" aria-hidden="true">03</span>
          <div className="k-journey-copy">
            <h3>Le créateur est payé</h3>
            <p>Sa commission lui revient, toi tu gardes ta réduction. Personne ne prend sa place.</p>
            <div className="k-journey-coins" aria-hidden="true">
              {example && <span className="k-journey-coin is-avatar"><CreatorAvatar name={example.creator} /></span>}
              <span className="k-journey-coin is-mint">+ commission</span>
              <span className="k-journey-coin is-blue">{example ? `${discount} pour toi` : 'ta réduction'}</span>
              <span className="k-journey-coin is-coral">0 pub</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
