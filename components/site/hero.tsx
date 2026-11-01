'use client';
import { useRef } from 'react';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import { codes, tools } from '@/lib/data';
import { routes } from '@/lib/routes';
import { SearchDialog } from './search-dialog';
import { MiniCoupon } from './coupon';
import { ToolSeal } from './tool-logo';
import { withLogosFirst } from '@/lib/tool-logos';

const rotating = ['NordVPN', 'o2switch', 'ElevenLabs', 'Shopify', 'Qonto', 'Babbel'];

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
);

export function Hero() {
  const root = useRef<HTMLElement>(null);
  // Quatre coupons, un par outil, de préférence des outils dont on a le logo. Ils remplacent l'ancienne ligne « Populaires ».
  const onePerTool = codes.filter((code, index, all) => code.status === 'verified' && all.findIndex(other => other.status === 'verified' && other.tool === code.tool) === index);
  const latest = withLogosFirst(onePerTool, code => code.tool).slice(0, 4);
  const slugOf = (name: string) => tools.find(tool => tool.name === name)?.slug ?? '';
  const verified = codes.filter(code => code.status === 'verified');
  const verifiedCount = verified.length;
  const successRate = Math.round(verified.reduce((sum, code) => sum + code.success, 0) / Math.max(1, verifiedCount));

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      // Entrée : le titre monte ligne par ligne, puis le reste suit.
      const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
      intro
        .from('.k-line > span', { yPercent: 110, duration: 1, stagger: 0.1 })
        .from('[data-hero-fade]', { y: 24, opacity: 0, duration: 0.8, stagger: 0.08 }, '-=0.6')
        .from('.k-float', { y: 120, opacity: 0, rotation: (i: number) => [-16, 12, -10, 14][i] ?? 0, duration: 1.1, stagger: 0.12, ease: 'expo.out' }, 0.25)
        .from('.k-stage-badge', { scale: 0.6, opacity: 0, duration: 0.6, ease: 'back.out(2)' }, '-=0.5');

      // Le nom de l'outil change dans le titre.
      const words = gsap.utils.toArray<HTMLElement>('.k-rotator > span');
      gsap.set(words, { yPercent: 110, opacity: 0 });
      gsap.set(words[0], { yPercent: 0, opacity: 1 });
      // Le soulignement perforé et la virgule suivent la largeur du mot affiché.
      const rotator = root.current?.querySelector<HTMLElement>('.k-rotator');
      if (rotator && words[0]) gsap.set(rotator, { width: words[0].offsetWidth });
      const cycle = gsap.timeline({ repeat: -1, delay: 1.8 });
      words.forEach((word, index) => {
        const next = words[(index + 1) % words.length];
        cycle
          .to(rotator ?? {}, { width: () => next.offsetWidth, duration: 0.6, ease: 'power3.inOut' }, '+=1.7')
          .to(word, { yPercent: -110, opacity: 0, duration: 0.5, ease: 'power3.in' }, '<')
          .fromTo(next, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power3.out', immediateRender: false }, '<0.25');
      });

      // Les coupons flottent doucement…
      gsap.utils.toArray<HTMLElement>('.k-float').forEach((el, i) => {
        gsap.to(el, { y: i % 2 ? 12 : -12, duration: 2.6 + i * 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.2 });
      });

      // … suivent le pointeur en 3D…
      const stack = root.current?.querySelector<HTMLElement>('.k-hero-stack');
      const stage = root.current?.querySelector<HTMLElement>('.k-hero-stage');
      if (stack && stage) {
        const rx = gsap.quickTo(stack, 'rotationX', { duration: 0.8, ease: 'power3.out' });
        const ry = gsap.quickTo(stack, 'rotationY', { duration: 0.8, ease: 'power3.out' });
        const move = (event: PointerEvent) => {
          const r = stage.getBoundingClientRect();
          ry(((event.clientX - r.left) / r.width - 0.5) * 16);
          rx(-((event.clientY - r.top) / r.height - 0.5) * 12);
        };
        const leave = () => { rx(0); ry(0); };
        root.current?.addEventListener('pointermove', move);
        root.current?.addEventListener('pointerleave', leave);
      }

      // … et s'écartent quand on fait défiler.
      gsap.to('.k-float-1', { yPercent: -40, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.k-float-3', { yPercent: 30, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } });
    });
  }, { scope: root });

  return (
    <section className="k-hero" ref={root}>
      <div className="k-wrap k-hero-grid">
        <div className="k-hero-text">
          <span className="k-pill" data-hero-fade><span className="k-dot" aria-hidden="true" />{verifiedCount} codes vérifiés à la main</span>
          <h1>
            <span className="k-line"><span>Avant de payer</span></span>
            <span className="k-line"><span><span className="k-rotator" aria-hidden="true">{rotating.map(word => <span key={word}>{word}</span>)}</span><span className="k-sr">ton outil</span>,</span></span>
            <span className="k-line"><span>prends le code.</span></span>
          </h1>
          <p className="k-hero-copy" data-hero-fade>Koupi retrouve le code promo que <strong>ton créateur préféré</strong> a donné en vidéo. Vérifié à la main, crédité au créateur. Pas de compte, pas de pub.</p>
          <div className="k-hero-search" data-hero-fade><SearchDialog /></div>
          <div className="k-trust" data-hero-fade>
            <span><Check />Le code reste celui du créateur</span>
            <span><Check />Testé et daté</span>
            <span><Check />Zéro pub</span>
          </div>
        </div>

        <div className="k-hero-stage" aria-label="Derniers codes vérifiés" role="region">
          <div className="k-stage-badge" aria-hidden="true">
            <span className="k-dot" />
            <span><strong>{successRate} %</strong> de réussite<br />selon les votes</span>
          </div>
          <div className="k-hero-stack">
            {latest.map((code, index) => (
              <MiniCoupon
                key={code.id}
                className={`k-float k-float-${index + 1}`}
                href={routes.tool(slugOf(code.tool))}
                code={code.code}
                avatar={<ToolSeal tool={slugOf(code.tool)} name={code.tool} />}
                title={<>{code.tool}, {code.discount}</>}
                subtitle={<>le code de {code.creator}</>}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
