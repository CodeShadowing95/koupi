'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import { isPublic, type Code, type Tool } from '@/lib/data';
import { routes } from '@/lib/routes';
import { SearchDialog } from './search-dialog';
import Link from '@/components/site/site-pages';
import { ToolSeal } from './tool-logo';
import { toolLogo, withLogosFirst } from '@/lib/tool-logos';
import { CreatorAvatar } from './creator-avatar';
import { flipFace, nextFlip, type FlipState } from '@/lib/hero-flip';
import { copyText, openCreatorLink } from '@/lib/copy';
import { track } from '@/lib/track';
import { playCouponSnip } from '@/lib/coupon-sound';
import { CODE_COPIED_EVENT, type CopiedCode } from '@/lib/vote-invite';

/** Temps entre deux coupons qui se retournent, et durée d'un demi-tour (axe horizontal). */
const FLIP_EVERY = 4.2;
const FLIP_DURATION = 1.7;

const rotating = ['NordVPN', 'o2switch', 'ElevenLabs', 'Shopify', 'Qonto', 'Babbel'];

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
);

/**
 * Petit coupon incliné du hero : le papier mène à la fiche de l'outil, le talon copie le code
 * et ouvre le lien du créateur, comme les autres coupons du site.
 */
function HeroCoupon({ slot, code, toolSlug, website }: { slot: number; code: Code; toolSlug: string; website?: string }) {
  const [copied, setCopied] = useState(false);
  // Le coupon s'est retourné sur un autre code : on efface « Copié ».
  useEffect(() => { setCopied(false); }, [code.id]);

  const copy = async () => {
    const copying = copyText(code.code);
    track('copy', code.id);
    playCouponSnip();
    window.dispatchEvent(new CustomEvent<CopiedCode>(CODE_COPIED_EVENT, { detail: { id: code.id, code: code.code, tool: code.tool, creator: code.creator } }));
    setCopied(true);
    await copying;
    const link = code.creatorLink || website;
    window.setTimeout(() => { if (link) { track('open', code.id); openCreatorLink(link); } }, 450);
    window.setTimeout(() => setCopied(false), 2400);
  };

  return (
    <div className={`k-coupon k-float k-float-${slot + 1}${copied ? ' is-copied' : ''}`}>
      <Link href={routes.tool(toolSlug)} className="k-coupon-main k-paper" aria-label={`Voir la fiche ${code.tool} : ${code.discount}, code de ${code.creator}`}>
        <ToolSeal key={code.id} tool={toolSlug} name={code.tool} />
        <span className="k-coupon-text">
          <strong>{code.tool}, {code.discount}</strong>
          <span><span className="k-by"><CreatorAvatar name={code.creator} size="xs" />de {code.creator}</span></span>
        </span>
      </Link>
      <button type="button" className="k-coupon-stub" onClick={copy} aria-label={`Copier le code ${code.code} et ouvrir le lien du créateur`}>
        <small>{copied ? 'Copié ✓' : 'Copier'}</small>
        <span className="k-coupon-code">{code.code}</span>
      </button>
      <span className="k-sr" role="status">{copied ? `Code ${code.code} copié` : ''}</span>
    </div>
  );
}

export function Hero({ codes, tools }: { codes: Code[]; tools: Tool[] }) {
  const root = useRef<HTMLElement>(null);
  // Quatre coupons, un par outil, de préférence des outils dont on a le logo. Ils remplacent l'ancienne ligne « Populaires ».
  const onePerTool = codes.filter((code, index, all) => code.status === 'verified' && all.findIndex(other => other.status === 'verified' && other.tool === code.tool) === index);
  // Réserve des coupons qui se retournent : les autres outils, codes vérifiés d'abord puis codes publics à tester.
  const shown = new Set(onePerTool.map(code => code.tool));
  const others = codes.filter((code, index, all) => isPublic(code) && code.status !== 'verified' && !shown.has(code.tool)
    && all.findIndex(other => isPublic(other) && other.status !== 'verified' && other.tool === code.tool) === index);
  // Les autres outils attendent en réserve : un coupon se retourne de temps en temps pour en montrer un.
  const pool = [...withLogosFirst(onePerTool, code => code.tool), ...withLogosFirst(others, code => code.tool)];
  const [slots, setSlots] = useState(() => pool.slice(0, 4));
  const flipState = useRef<FlipState<Code>>({ slots: pool.slice(0, 4), queue: pool.slice(4) });
  const slugOf = (name: string) => tools.find(tool => tool.name === name)?.slug ?? '';
  const verified = codes.filter(code => code.status === 'verified');
  const verifiedCount = verified.length;
  const successRate = Math.round(verified.reduce((sum, code) => sum + code.success, 0) / Math.max(1, verifiedCount));

  // Les logos de la réserve sont chargés à l'avance : le nouveau logo est prêt quand le coupon se retourne.
  useEffect(() => {
    for (const code of flipState.current.queue) {
      const logo = toolLogo(slugOf(code.tool)) ?? toolLogo(code.tool);
      if (logo) new Image().src = logo.src;
    }
  }, []); // une seule fois, au montage

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

      // … se retournent un par un (demi-tour sur l'axe horizontal) pour montrer un autre code…
      let visible = true;
      let lastSlot = -1;
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
      if (root.current) observer.observe(root.current);
      const flipOne = () => {
        const next = nextFlip(flipState.current, lastSlot);
        const card = next && root.current?.querySelector<HTMLElement>(`.k-float-${next.slot + 1}`);
        // On ne retourne pas un coupon que la personne survole ou a sélectionné au clavier.
        if (!next || !card || !visible || document.hidden || card.matches(':hover, :focus-within')) {
          timer = gsap.delayedCall(FLIP_EVERY, flipOne);
          return;
        }
        lastSlot = next.slot;
        let swapped = false;
        const turn = { angle: 0 };
        gsap.set(card, { transformPerspective: 1600 });
        gsap.to(turn, {
          angle: 180,
          duration: FLIP_DURATION,
          ease: 'sine.inOut',
          onUpdate: () => {
            const face = flipFace(turn.angle);
            // Léger soulèvement pendant le tour, pour un mouvement plus doux.
            gsap.set(card, { rotationX: face.rotation, scale: 1 + 0.03 * Math.sin((turn.angle / 180) * Math.PI) });
            if (face.swapped && !swapped) {
              swapped = true;
              flipState.current = next.state;
              setSlots(next.state.slots);
            }
          },
          onComplete: () => {
            gsap.set(card, { rotationX: 0, scale: 1 });
            timer = gsap.delayedCall(FLIP_EVERY, flipOne);
          },
        });
      };
      let timer = gsap.delayedCall(FLIP_EVERY + 1, flipOne);
      const stopFlips = () => { timer.kill(); observer.disconnect(); };

      // … et s'écartent quand on fait défiler.
      gsap.to('.k-float-1', { yPercent: -40, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.k-float-3', { yPercent: 30, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } });
      return stopFlips;
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
          <div className="k-hero-search" data-hero-fade><SearchDialog tools={tools} /></div>
          <div className="k-trust" data-hero-fade>
            <span><Check />Le code reste celui du créateur</span>
            <span><Check />Testé et daté</span>
            <span><Check />Zéro pub</span>
          </div>
        </div>

        <div className="k-hero-stage" aria-label="Codes du moment" role="region">
          <div className="k-stage-badge" aria-hidden="true">
            <span className="k-dot" />
            <span><strong>{successRate} %</strong> de réussite<br />selon les votes</span>
          </div>
          <div className="k-hero-stack">
            {slots.map((code, index) => (
              // La clé suit la place, pas le code : le coupon reste le même élément quand il se retourne.
              <HeroCoupon key={`slot-${index}`} slot={index} code={code} toolSlug={slugOf(code.tool)} website={tools.find(tool => tool.name === code.tool)?.website} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
