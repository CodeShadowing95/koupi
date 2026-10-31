'use client';
import { useRef } from 'react';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';

// « Comment ça marche » : des notes épinglées et inclinées, reliées par une ligne perforée.
// Adapté du composant « How It Works » de chamaac (21st.dev) : Motion remplacé par GSAP,
// la ligne se dessine au défilement (DrawSVG) et les notes se posent une à une.

const steps = [
  { title: 'Cherche ton outil', text: 'Tape son nom. On te montre le code donné par un créateur, la vidéo d’où il vient et la date de vérification.', art: 'search' },
  { title: 'Détache le coupon', text: 'Un geste : le code est copié, et le site s’ouvre avec le lien du créateur, tel quel.', art: 'coupon' },
  { title: 'Le créateur est payé', text: 'Sa commission lui revient, toi tu gardes ta réduction. Personne ne prend sa place.', art: 'pay' },
] as const;

const Pin = () => (
  <svg className="k-step-pin" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 3a1 1 0 0 1 .117 1.993l-.117 .007v4.764l1.894 3.789a1 1 0 0 1 .1 .331l.006 .116v2a1 1 0 0 1 -.883 .993l-.117 .007h-4v4a1 1 0 0 1 -1.993 .117l-.007 -.117v-4h-4a1 1 0 0 1 -.993 -.883l-.007 -.117v-2a1 1 0 0 1 .06 -.34l.046 -.107l1.894 -3.791v-4.762a1 1 0 0 1 -.117 -1.993l.117 -.007h8z" /></svg>
);

function Art({ kind }: { kind: (typeof steps)[number]['art'] }) {
  if (kind === 'search') {
    return (
      <div className="k-step-art">
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, border: '1.5px solid rgba(23,21,15,.2)', fontSize: 14, color: '#17150F', background: '#fff' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          NordV<span style={{ width: 2, height: 16, background: '#2A3BD6' }} />
        </span>
      </div>
    );
  }
  if (kind === 'coupon') {
    return (
      <div className="k-step-art">
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, padding: '9px 14px', borderRadius: 10, border: '2px dashed #2A3BD6', color: '#2A3BD6', background: '#EEF0FF' }}>YTSTACK</span>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FF6A3D" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" /></svg>
      </div>
    );
  }
  return (
    <div className="k-step-art">
      <span className="k-av k-av-2" aria-hidden="true">TS</span>
      <span style={{ fontWeight: 700, color: '#0B6B43', background: '#DDF5E8', padding: '6px 10px', borderRadius: 999, fontSize: 13 }}>+ commission</span>
      <span style={{ fontWeight: 700, color: '#2A3BD6', background: '#EEF0FF', padding: '6px 10px', borderRadius: 999, fontSize: 13 }}>− 76 % pour toi</span>
    </div>
  );
}

export function HowItWorks() {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.fromTo('.k-steps-draw', { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', scrollTrigger: { trigger: root.current, start: 'top 70%', end: 'bottom 60%', scrub: 0.6 } });
      gsap.utils.toArray<HTMLElement>('.k-step').forEach(step => {
        gsap.from(step, { y: 90, opacity: 0, rotation: 0, scale: 0.92, duration: 1, ease: 'back.out(1.4)', scrollTrigger: { trigger: step, start: 'top 85%', once: true } });
      });
    });
  }, { scope: root });

  return (
    <div className="k-steps" ref={root}>
      <svg className="k-steps-path" viewBox="0 0 1000 820" preserveAspectRatio="none" aria-hidden="true">
        <path d="M 380 150 C 560 150, 500 390, 640 390 C 780 390, 640 650, 460 660" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path className="k-steps-draw" d="M 380 150 C 560 150, 500 390, 640 390 C 780 390, 640 650, 460 660" fill="none" stroke="#FF6A3D" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {steps.map((step, index) => (
        <article className={`k-step k-step-${index + 1}`} key={step.title}>
          <Pin />
          <div className="k-step-in k-paper">
            <span className="k-step-num">ÉTAPE 0{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
            <Art kind={step.art} />
          </div>
        </article>
      ))}
    </div>
  );
}
