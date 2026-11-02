'use client';
import Link from 'next/link';
import { useRef } from 'react';
import type { Tool } from '@/lib/data';
import { routes } from '@/lib/routes';
import { gsap, MOTION_OK, ScrollTrigger, SplitText, useGSAP } from '@/lib/gsap';
import { playCouponSnip, playCouponTear, primeSound } from '@/lib/coupon-sound';
import { MiniCoupon } from '@/components/site/coupon';
import { ToolLogo, ToolSeal } from '@/components/site/tool-logo';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { SearchDialog } from '@/components/site/search-dialog';

// Page « Koupi Magic » (/magic, lien dans le pied de page) : l'accueil de Koupi en version spectacle. Même contenu, autre mise en scène.
//  1. Entrée : un coupon arrive du fond, les ciseaux le découpent, il s'ouvre et on passe à travers.
//  2. Héros : on est « dans » le coupon (papier crème perforé), titre lettre par lettre, logos en apesanteur.
//  3. Bandeaux qui se penchent selon la vitesse du défilement.
//  4. Tunnel 3D : on vole à travers les codes du moment.
//  5. Comment ça marche : défilement horizontal, ligne perforée qui se dessine, talon qui se détache.
//  6. La règle Koupi : le texte s'allume mot à mot.
//  7. Catégories en éventail, puis final avec une pluie de coupons.
// Tout passe par gsap.matchMedia(MOTION_OK) : avec « réduire les animations », la page reste lisible et immobile.

export type MagicCode = {
  id: string; code: string; tool: string; toolSlug: string; creator: string; creatorSlug: string;
  discount: string; success: number; votes: number; link: string;
};

type Props = {
  codes: MagicCode[];
  best?: MagicCode;
  tools: Tool[];
  creators: string[];
  /** Créateurs mis en avant dans l'orbite (un par créateur). */
  spotlight: { name: string; slug: string; codes: number; tool: string; discount: string }[];
  categories: { slug: string; name: string; count: number }[];
};

const COLORS = ['#FF6A3D', '#FFF7E8', '#8C9BFF', '#5BE3A4', '#FFC46B'];
const TUNNEL_GAP = 900;

const Scissors = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" /></svg>
);
const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
const Sparkle = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c.4 4.6 2.4 7.6 10 10-7.6 2.4-9.6 5.4-10 10-.4-4.6-2.4-7.6-10-10 7.6-2.4 9.6-5.4 10-10z" /></svg>
);

/** Positions des logos en apesanteur dans le héros (en % du coupon). */
const FLOATERS = [
  { x: 9, y: 22, s: 1.15, r: -14 }, { x: 88, y: 18, s: 1, r: 12 }, { x: 6, y: 72, s: 0.9, r: 8 },
  { x: 92, y: 70, s: 1.2, r: -10 }, { x: 22, y: 88, s: 0.8, r: 18 }, { x: 77, y: 90, s: 0.85, r: -6 },
  { x: 28, y: 10, s: 0.7, r: 6 }, { x: 70, y: 8, s: 0.75, r: -16 },
];

export function MagicHome({ codes, best, tools, creators, spotlight, categories }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const intro = useRef<gsap.core.Timeline | null>(null);
  const first = codes[0] ?? best;
  const featuredTools = codes.map(code => tools.find(tool => tool.name === code.tool)).filter((tool): tool is Tool => Boolean(tool));
  const floaters = (featuredTools.length ? featuredTools : tools).slice(0, FLOATERS.length);
  const sample = codes.map(code => code.code);

  const { contextSafe } = useGSAP(() => {
    const scope = root.current;
    if (!scope) return;
    const mm = gsap.matchMedia();

    mm.add(MOTION_OK, () => {
      const html = document.documentElement;
      const portal = scope.querySelector<HTMLElement>('.m-portal');
      portal?.classList.add('is-live');

      // ---------- 1. Entrée : on traverse le coupon ----------
      const release = () => { html.style.overflow = ''; html.classList.remove('m-intro-on'); };
      html.style.overflow = 'hidden';
      html.classList.add('m-intro-on');
      window.scrollTo(0, 0);

      const title = SplitText.create('.m-title', { type: 'words,chars', wordsClass: 'm-word', charsClass: 'm-char' });
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: release });
      intro.current = tl;
      tl.set('.m-portal', { autoAlpha: 1 })
        .from('.m-portal-coupon', { scale: 0.04, rotationY: -720, rotationX: 50, z: -1200, autoAlpha: 0, duration: 1.6, ease: 'expo.out' })
        .from('.m-portal-hint', { autoAlpha: 0, y: 12, duration: 0.5 }, '-=0.6')
        .from('.m-perf i', { scale: 0, duration: 0.3, stagger: 0.025, ease: 'back.out(3)' }, '-=0.8')
        .fromTo('.m-portal-scissors', { y: -30, autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, '-=0.1')
        .to('.m-portal-scissors', { y: () => (scope.querySelector<HTMLElement>('.m-portal-coupon')?.offsetHeight ?? 260) + 10, duration: 0.9, ease: 'power2.inOut' })
        .to('.m-portal-scissors svg', { rotation: 18, duration: 0.09, repeat: 9, yoyo: true, ease: 'none' }, '<')
        .add(() => burst(scope.querySelector<HTMLElement>('.m-portal-burst'), 46, 520), '-=0.05')
        .to('.m-portal-left', { xPercent: -140, rotation: -28, rotationY: 50, autoAlpha: 0, duration: 1.1, ease: 'power3.in' }, '<')
        .to('.m-portal-right', { xPercent: 140, rotation: 30, rotationY: -50, autoAlpha: 0, duration: 1.1, ease: 'power3.in' }, '<')
        .to('.m-portal-scissors, .m-portal-hint', { autoAlpha: 0, duration: 0.3 }, '<')
        .fromTo('.m-portal-light', { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: 0.9, ease: 'expo.inOut' }, '<0.25')
        .to('.m-portal', { autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, '-=0.15')
        .from('.m-paper', { scale: 1.35, filter: 'blur(14px)', duration: 1.2, ease: 'expo.out' }, '<')
        .from(title.chars, { yPercent: 120, rotationX: -90, autoAlpha: 0, duration: 0.9, stagger: 0.025, ease: 'back.out(1.8)' }, '<0.15')
        .from('.m-hero-fade', { y: 30, autoAlpha: 0, duration: 0.7, stagger: 0.08 }, '<0.35')
        .from('.m-float', { scale: 0, rotation: () => gsap.utils.random(-180, 180), duration: 1, stagger: 0.06, ease: 'back.out(2)' }, '<')
        .add(release, '<');

      // Les logos flottent puis suivent le pointeur, chacun selon sa profondeur.
      gsap.utils.toArray<HTMLElement>('.m-float').forEach((el, i) => {
        gsap.to(el.firstElementChild, { y: gsap.utils.random(-22, 22), rotation: gsap.utils.random(-12, 12), duration: gsap.utils.random(2.4, 4), repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.2 });
      });
      const floatSetters = gsap.utils.toArray<HTMLElement>('.m-float').map((el, i) => ({
        x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3.out' }),
        depth: 18 + (i % 4) * 14,
      }));
      const paper = scope.querySelector<HTMLElement>('.m-paper');
      const tiltX = paper ? gsap.quickTo(paper, 'rotationY', { duration: 1.2, ease: 'power3.out' }) : null;
      const tiltY = paper ? gsap.quickTo(paper, 'rotationX', { duration: 1.2, ease: 'power3.out' }) : null;
      const onHeroMove = (event: PointerEvent) => {
        const nx = event.clientX / window.innerWidth - 0.5;
        const ny = event.clientY / window.innerHeight - 0.5;
        floatSetters.forEach(f => { f.x(-nx * f.depth * 2); f.y(-ny * f.depth * 2); });
        tiltX?.(nx * 5);
        tiltY?.(-ny * 4);
      };
      window.addEventListener('pointermove', onHeroMove, { passive: true });

      // Le code affiché dans le héros se brouille et change toutes les 2,4 s.
      const codeEl = scope.querySelector<HTMLElement>('.m-scramble');
      let shown = 0;
      const cycle = sample.length > 1 && codeEl
        ? gsap.delayedCall(2.4, function next() {
          shown = (shown + 1) % sample.length;
          gsap.to(codeEl, { duration: 0.9, scrambleText: { text: sample[shown], chars: 'KOUPI0123456789', speed: 0.6 } });
          cycle?.restart(true);
        })
        : null;

      // Le héros s'enfonce quand on descend.
      gsap.to('.m-paper', { scale: 0.86, rotationX: 14, autoAlpha: 0.35, ease: 'none', scrollTrigger: { trigger: '.m-hero', start: 'top top', end: 'bottom top', scrub: true } });

      // Barre de progression : une ligne perforée découpée par des ciseaux.
      gsap.fromTo('.m-progress-fill', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
      gsap.fromTo('.m-progress-scissors', { left: '0%' }, { left: '100%', ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

      // ---------- 3. Bandeaux sensibles à la vitesse ----------
      const loops = gsap.utils.toArray<HTMLElement>('.m-band-track').map((band, i) =>
        gsap.fromTo(band, { xPercent: i % 2 ? -50 : 0 }, { xPercent: i % 2 ? 0 : -50, duration: i % 2 ? 110 : 45, ease: 'none', repeat: -1 }));
      const skew = gsap.quickTo('.m-bands', 'skewY', { duration: 0.5, ease: 'power3.out' });
      ScrollTrigger.create({
        trigger: '.m-bands',
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: self => {
          const v = self.getVelocity();
          skew(gsap.utils.clamp(-7, 7, v / -260));
          loops.forEach(loop => {
            gsap.to(loop, { timeScale: 1 + Math.min(Math.abs(v) / 300, 6), duration: 0.2, overwrite: true, onComplete: () => { gsap.to(loop, { timeScale: 1, duration: 1.2 }); } });
          });
        },
      });

      // ---------- 4. Tunnel 3D ----------
      const slides = gsap.utils.toArray<HTMLElement>('.m-tunnel-item');
      const n = slides.length;
      const placements = slides.map((_, i) => ({ x: i % 2 ? 1 : -1, y: (i % 3) - 1, r: (i % 2 ? 1 : -1) * (6 + (i % 3) * 3) }));
      const depthState = { p: 0 };
      const renderTunnel = () => {
        const wide = window.innerWidth > 760;
        slides.forEach((slide, i) => {
          const last = i === n - 1;
          const z = -TUNNEL_GAP * (i + 1) + depthState.p * TUNNEL_GAP * (n + 0.4);
          const fadeIn = gsap.utils.clamp(0, 1, (z + TUNNEL_GAP * (last ? 1.6 : 4)) / TUNNEL_GAP);
          const fadeOut = last ? 1 : gsap.utils.clamp(0, 1, 1 - (z - 150) / 450);
          const spread = last ? 0 : wide ? 260 : 70;
          const place = placements[i];
          gsap.set(slide, {
            z,
            x: place.x * spread,
            y: place.y * (wide ? 90 : 120),
            rotation: last ? 0 : place.r + depthState.p * place.x * 20,
            autoAlpha: Math.min(fadeIn, fadeOut),
          });
        });
      };
      renderTunnel();
      gsap.to(depthState, {
        p: 1,
        ease: 'none',
        onUpdate: renderTunnel,
        scrollTrigger: { trigger: '.m-tunnel', start: 'top top', end: () => `+=${n * 70}%`, pin: true, scrub: 1, invalidateOnRefresh: true },
      });
      gsap.from('.m-tunnel-head > *', { y: 40, autoAlpha: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.m-tunnel', start: 'top 70%' } });

      // ---------- 5. Comment ça marche, à l'horizontale ----------
      const track = scope.querySelector<HTMLElement>('.m-journey-track');
      if (track) {
        const distance = () => track.scrollWidth - window.innerWidth;
        const slide = gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: { trigger: '.m-journey', start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: 1, invalidateOnRefresh: true },
        });
        // La ligne part de l'étape 1 et sa pointe avance devant le lecteur jusqu'à la fin de l'étape 3.
        gsap.fromTo('.m-journey-line', { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', scrollTrigger: { trigger: '.m-journey-svg', containerAnimation: slide, start: 'left 75%', end: 'right right', scrub: true } });
        gsap.utils.toArray<HTMLElement>('.m-step').forEach(step => {
          gsap.from(step.querySelectorAll('.m-step-num, .m-step-copy > *'), {
            y: 80, autoAlpha: 0, rotation: 4, stagger: 0.08, duration: 0.9, ease: 'back.out(1.6)',
            scrollTrigger: { trigger: step, containerAnimation: slide, start: 'left 75%', toggleActions: 'play none none reverse' },
          });
        });
        // Étape 1 : la barre de recherche s'écrit toute seule.
        const typed = scope.querySelector<HTMLElement>('.m-typed');
        if (typed && first) {
          gsap.to(typed, {
            duration: 1.2,
            scrambleText: { text: first.tool, chars: 'lowerCase', revealDelay: 0.2, speed: 0.5 },
            scrollTrigger: { trigger: '.m-step-1', containerAnimation: slide, start: 'left 60%', toggleActions: 'play none none reverse' },
          });
        }
        // Étape 2 : le talon se détache au rythme du défilement.
        gsap.timeline({ scrollTrigger: { trigger: '.m-step-2', containerAnimation: slide, start: 'left 55%', end: 'center 40%', scrub: 1 } })
          .to('.m-big-stub', { rotation: 24, x: 70, y: 150, ease: 'power2.in' })
          .fromTo('.m-big-stamp', { scale: 2.6, autoAlpha: 0, rotation: -2 }, { scale: 1, autoAlpha: 1, rotation: -12, ease: 'back.out(3)' }, 0.35);
        // Étape 3 : la commission monte vers le créateur.
        gsap.from('.m-coin', {
          y: 160, autoAlpha: 0, scale: 0.4, stagger: 0.12, duration: 0.9, ease: 'back.out(2)',
          scrollTrigger: { trigger: '.m-step-3', containerAnimation: slide, start: 'left 60%', toggleActions: 'play none none reverse' },
        });
      }

      // ---------- 5 bis. L'orbite des créateurs ----------
      // Les créateurs tournent autour du coupon ; le défilement accélère la rotation, chaque avatar reste droit.
      const orbit = gsap.to('.m-orbit-ring', { rotation: 360, duration: 60, ease: 'none', repeat: -1 });
      const counter = gsap.to('.m-orbit-item > a', { rotation: -360, duration: 60, ease: 'none', repeat: -1 });
      ScrollTrigger.create({
        trigger: '.m-orbit',
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: self => {
          const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 120, 14);
          [orbit, counter].forEach(tween => gsap.to(tween, { timeScale: boost, duration: 0.25, overwrite: true, onComplete: () => { gsap.to(tween, { timeScale: 1, duration: 1.4 }); } }));
        },
      });
      gsap.from('.m-orbit-item', { scale: 0, autoAlpha: 0, stagger: 0.06, duration: 0.9, ease: 'back.out(2)', scrollTrigger: { trigger: '.m-orbit', start: 'top 70%' } });
      gsap.from('.m-orbit-core', { scale: 0.4, rotation: -30, autoAlpha: 0, duration: 1.2, ease: 'elastic.out(1,0.6)', scrollTrigger: { trigger: '.m-orbit', start: 'top 65%' } });

      // ---------- 6. La règle Koupi, mot à mot ----------
      const manifesto = SplitText.create('.m-manifesto-text', { type: 'words' });
      gsap.fromTo(manifesto.words, { opacity: 0.12, filter: 'blur(4px)' }, {
        opacity: 1, filter: 'blur(0px)', stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: '.m-manifesto', start: 'top 70%', end: 'bottom 55%', scrub: 0.5 },
      });
      gsap.utils.toArray<HTMLElement>('.m-num').forEach(el => {
        const value = Number(el.dataset.value ?? 0);
        const obj = { v: 0 };
        gsap.to(obj, { v: value, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = String(Math.round(obj.v)); }, scrollTrigger: { trigger: el, start: 'top 85%' } });
      });

      // ---------- 7. Catégories en éventail ----------
      gsap.from('.m-cat', {
        rotation: (i: number) => (i % 2 ? 1 : -1) * (14 + i * 3), y: 160, x: (i: number) => (i % 3 - 1) * -120, autoAlpha: 0, transformOrigin: '50% 140%',
        stagger: 0.07, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.m-cats', start: 'top 75%' },
      });
      gsap.from('.m-final-title .m-final-line', { yPercent: 110, stagger: 0.12, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.m-final', start: 'top 70%' } });

      // ---------- Traînée de perforations derrière le pointeur ----------
      const trail = scope.querySelector<HTMLElement>('.m-trail');
      let last = { x: 0, y: 0 };
      let count = 0;
      const onTrail = (event: PointerEvent) => {
        if (!trail || event.pointerType !== 'mouse') return;
        const dx = event.clientX - last.x;
        const dy = event.clientY - last.y;
        if (dx * dx + dy * dy < 500) return;
        last = { x: event.clientX, y: event.clientY };
        const dot = document.createElement('i');
        dot.style.left = `${event.clientX}px`;
        dot.style.top = `${event.clientY}px`;
        dot.style.background = COLORS[count++ % COLORS.length];
        trail.appendChild(dot);
        gsap.fromTo(dot, { scale: 1, opacity: 0.9 }, { scale: 0, opacity: 0, y: gsap.utils.random(10, 40), x: gsap.utils.random(-14, 14), duration: 0.9, ease: 'power2.out', onComplete: () => dot.remove() });
      };
      window.addEventListener('pointermove', onTrail, { passive: true });

      return () => {
        release();
        cycle?.kill();
        window.removeEventListener('pointermove', onHeroMove);
        window.removeEventListener('pointermove', onTrail);
        trail?.replaceChildren();
        intro.current = null;
      };
    });
  }, { scope: root });

  /** Gerbe de confettis de perforation (Physics2D) depuis le centre d'un calque. */
  function burst(layer: HTMLElement | null, amount: number, power: number) {
    if (!layer) return;
    for (let i = 0; i < amount; i++) {
      const dot = document.createElement('i');
      dot.style.background = COLORS[i % COLORS.length];
      const size = gsap.utils.random(5, 12);
      dot.style.width = `${size}px`;
      dot.style.height = `${i % 4 === 0 ? size * 2.2 : size}px`;
      layer.appendChild(dot);
      gsap.to(dot, {
        duration: gsap.utils.random(1.2, 2),
        physics2D: { velocity: gsap.utils.random(power * 0.4, power), angle: gsap.utils.random(0, 360), gravity: 700 },
        rotation: gsap.utils.random(-540, 540),
        opacity: 0,
        ease: 'power1.in',
        onComplete: () => dot.remove(),
      });
    }
  }

  const skipIntro = contextSafe(() => {
    intro.current?.progress(1);
  });

  const replayIntro = contextSafe(() => {
    window.scrollTo(0, 0);
    const tl = intro.current;
    if (!tl) return;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.classList.add('m-intro-on');
    tl.restart();
  });

  // Pluie de coupons : des tickets portant les vrais codes tombent depuis le bouton.
  const rain = contextSafe((event: React.MouseEvent<HTMLButtonElement>) => {
    primeSound();
    playCouponTear({ stamp: false });
    const layer = root.current?.querySelector<HTMLElement>('.m-rain');
    if (!layer) return;
    if (!window.matchMedia(MOTION_OK).matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    const names = sample.length ? sample : ['KOUPI'];
    for (let i = 0; i < 34; i++) {
      const ticket = document.createElement('span');
      ticket.className = 'm-rain-ticket';
      ticket.textContent = names[i % names.length];
      ticket.style.left = `${box.left + box.width / 2}px`;
      ticket.style.top = `${box.top + box.height / 2}px`;
      ticket.style.setProperty('--tint', COLORS[i % COLORS.length]);
      layer.appendChild(ticket);
      gsap.fromTo(ticket, { scale: 0.3, rotation: gsap.utils.random(-30, 30) }, {
        scale: gsap.utils.random(0.8, 1.2),
        duration: gsap.utils.random(1.8, 2.8),
        physics2D: { velocity: gsap.utils.random(450, 900), angle: gsap.utils.random(-160, -20), gravity: 900 },
        rotation: gsap.utils.random(-400, 400),
        ease: 'none',
        onComplete: () => ticket.remove(),
      });
    }
    window.setTimeout(playCouponSnip, 380);
  });

  const perf = Array.from({ length: 12 });

  return (
    <div className="k-magic" ref={root}>
      {/* 1. L'entrée */}
      <div className="m-portal" aria-hidden="true">
        <div className="m-portal-stage">
          <div className="m-portal-coupon">
            <div className="m-portal-left">
              <span className="m-portal-brand">KOUPI · ADMIT ONE</span>
              <strong>{first?.discount ?? 'Le bon code'}</strong>
              <span>{first ? `${first.tool} · de ${first.creator}` : 'Les codes des créateurs'}</span>
            </div>
            <div className="m-perf">{perf.map((_, i) => <i key={i} />)}</div>
            <div className="m-portal-right">
              <span>CODE</span>
              <strong className="k-mono">{first?.code ?? 'KOUPI'}</strong>
            </div>
            <span className="m-portal-scissors"><Scissors size={40} /></span>
          </div>
          <div className="m-portal-burst" />
          <p className="m-portal-hint">On découpe…</p>
        </div>
        <span className="m-portal-light" />
        <button type="button" className="m-skip" onClick={skipIntro} tabIndex={-1}>Passer l&apos;intro</button>
      </div>
      <div className="m-trail" aria-hidden="true" />
      <div className="m-rain" aria-hidden="true" />
      <div className="m-progress" aria-hidden="true"><span className="m-progress-fill" /><span className="m-progress-scissors"><Scissors size={18} /></span></div>

      {/* 2. Héros : dans le coupon */}
      <section className="m-hero">
        <div className="m-paper">
          <span className="m-paper-watermark" aria-hidden="true">KOUPI</span>
          {floaters.map((tool, i) => (
            <span className="m-float" key={tool.slug} style={{ left: `${FLOATERS[i].x}%`, top: `${FLOATERS[i].y}%`, ['--s' as string]: FLOATERS[i].s, ['--r' as string]: `${FLOATERS[i].r}deg` }} aria-hidden="true">
              <span><ToolLogo tool={tool.slug} name={tool.name} /></span>
            </span>
          ))}
          <div className="m-hero-in">
            <span className="m-eyebrow m-hero-fade"><Sparkle /> Tu viens de passer de l&apos;autre côté</span>
            <h1 className="m-title">Tu es <em>dans</em> le coupon.</h1>
            <p className="m-hero-copy m-hero-fade">Ici, chaque code promo a un visage : celui du créateur qui l&apos;a donné en vidéo. Vérifié à la main, crédité, sans pub.</p>
            <div className="m-hero-search m-hero-fade"><SearchDialog tools={tools} /></div>
            {first && (
              <p className="m-ticker m-hero-fade" aria-live="off">
                <span>Code du moment</span>
                <strong className="m-scramble k-mono">{first.code}</strong>
              </p>
            )}
          </div>
          <span className="m-scroll-cue m-hero-fade" aria-hidden="true">Descends<i /></span>
        </div>
      </section>

      {/* 3. Bandeaux */}
      <div className="m-bands" aria-hidden="true">
        <div className="m-band"><div className="m-band-track">{[0, 1].map(k => <div className="m-band-group" key={k}>{tools.map(tool => <span key={tool.slug}>{tool.name}<Scissors size={26} /></span>)}</div>)}</div></div>
        <div className="m-band m-band-2"><div className="m-band-track">{[0, 1].map(k => <div className="m-band-group" key={k}>{creators.map(name => <span key={name}>de {name}<Sparkle /></span>)}</div>)}</div></div>
      </div>

      {/* 4. Tunnel des codes */}
      <section className="m-tunnel" aria-labelledby="m-tunnel-title">
        <div className="m-tunnel-head">
          <span className="m-eyebrow">Codes du moment</span>
          <h2 id="m-tunnel-title">Plonge dans les codes.</h2>
          <p>Clique sur un talon au passage : le code est copié.</p>
        </div>
        <div className="m-tunnel-world">
          {codes.map(code => (
            <div className="m-tunnel-item" key={code.id}>
              <MiniCoupon
                codeId={code.id}
                code={code.code}
                link={code.link}
                avatar={<ToolSeal tool={code.toolSlug} name={code.tool} />}
                title={<>{code.tool} · {code.discount}</>}
                subtitle={<span className="k-by"><CreatorAvatar name={code.creator} size="xs" />de {code.creator}</span>}
              />
            </div>
          ))}
          <div className="m-tunnel-item m-tunnel-end">
            <strong>Chaque code<br />a un <em>créateur</em>.</strong>
          </div>
        </div>
      </section>

      {/* 5. Comment ça marche */}
      <section className="m-journey" aria-labelledby="m-journey-title">
        <div className="m-journey-track">
          <svg className="m-journey-svg" viewBox="0 0 3000 200" preserveAspectRatio="none" aria-hidden="true">
            <path className="m-journey-line" d="M0,120 C300,20 600,200 1000,110 S1700,10 2000,120 S2700,200 3000,90" />
          </svg>
          <div className="m-step m-step-0">
            <div className="m-step-copy">
              <span className="m-eyebrow">Comment ça marche</span>
              <h2 id="m-journey-title">Trois gestes,<br /><em>zéro code mort.</em></h2>
              <p>On ne t&apos;envoie pas sur un site rempli de faux boutons. Tu trouves, tu détaches, le créateur est payé.</p>
            </div>
          </div>
          <div className="m-step m-step-1">
            <span className="m-step-num">01</span>
            <div className="m-step-copy">
              <h3>Cherche ton outil</h3>
              <p>Tape son nom. On te montre le code donné par un créateur, la vidéo d&apos;où il vient et la date de vérification.</p>
              <div className="m-fake-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><span className="m-typed">{first?.tool ?? 'NordVPN'}</span><i /></div>
            </div>
          </div>
          <div className="m-step m-step-2">
            <span className="m-step-num">02</span>
            <div className="m-step-copy">
              <h3>Détache le coupon</h3>
              <p>Un geste : le code est copié, et le site s&apos;ouvre avec le lien du créateur, tel quel.</p>
              <div className="m-big-coupon" aria-hidden="true">
                <div className="m-big-main"><span>{first?.tool ?? 'Koupi'}</span><strong>{first?.discount ?? '−20 %'}</strong><span className="m-big-stamp">Copié !</span></div>
                <div className="m-big-stub"><span>CODE</span><strong className="k-mono">{first?.code ?? 'KOUPI'}</strong></div>
              </div>
            </div>
          </div>
          <div className="m-step m-step-3">
            <span className="m-step-num">03</span>
            <div className="m-step-copy">
              <h3>Le créateur est payé</h3>
              <p>Sa commission lui revient, toi tu gardes ta réduction. Personne ne prend sa place.</p>
              <div className="m-coins" aria-hidden="true">
                {best && <span className="m-coin m-coin-av"><CreatorAvatar name={best.creator} /></span>}
                <span className="m-coin is-mint">+ commission</span>
                <span className="m-coin is-blue">{best ? `${best.discount} pour toi` : 'ta réduction'}</span>
                <span className="m-coin is-coral">0 pub</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 bis. Les créateurs */}
      <section className="m-orbit-wrap" aria-labelledby="m-orbit-title">
        <div className="k-wrap m-orbit-grid">
          <div className="m-orbit-copy">
            <span className="m-eyebrow">Ils ont donné le code</span>
            <h2 id="m-orbit-title" className="m-h2">Des créateurs,<br /><em>pas des robots.</em></h2>
            <p>Chaque code vient d&apos;une vraie vidéo, d&apos;un vrai podcast ou d&apos;un vrai post. On te dit qui l&apos;a donné, où, et on te renvoie vers lui. Clique sur un visage pour voir tous ses codes.</p>
            <ul className="m-orbit-list">
              {spotlight.slice(0, 4).map(person => (
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
          <div className="m-orbit" aria-hidden="true">
            <div className="m-orbit-track m-orbit-track-1" />
            <div className="m-orbit-track m-orbit-track-2" />
            <div className="m-orbit-ring">
              {spotlight.map((person, i) => (
                <span className="m-orbit-item" key={person.slug} style={{ ['--a' as string]: `${(360 / spotlight.length) * i}deg`, ['--d' as string]: i % 2 ? 'var(--orbit-in)' : 'var(--orbit-out)' }}>
                  <Link href={routes.creator(person.slug)} tabIndex={-1} title={`Les codes de ${person.name}`}>
                    <CreatorAvatar name={person.name} />
                    <small>{person.codes} {person.codes > 1 ? 'codes' : 'code'}</small>
                  </Link>
                </span>
              ))}
            </div>
            <div className="m-orbit-core">
              <span className="m-orbit-brand">KOUPI</span>
              <strong>{creators.length}</strong>
              <span>créateurs crédités</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. La règle Koupi */}
      <section className="m-manifesto">
        <div className="k-wrap">
          <span className="m-eyebrow">La règle Koupi</span>
          <p className="m-manifesto-text">Le code reste celui du créateur. Toujours. On ne le remplace jamais par un code à nous, son lien est ouvert tel quel, sans suivi ajouté&nbsp;: sa commission lui revient.</p>
          <div className="m-stats">
            <div><span className="m-num" data-value={tools.length}>{tools.length}</span><span>outils suivis</span></div>
            <div><span className="m-num" data-value={creators.length}>{creators.length}</span><span>créateurs crédités</span></div>
            {best && <div><span className="m-num" data-value={best.success}>{best.success}</span><span>% de réussite pour {best.creator} sur {best.tool}</span></div>}
          </div>
          <Link className="k-link" href={routes.transparency}>Comment Koupi gagne de l&apos;argent →</Link>
        </div>
      </section>

      {/* 7. Catégories */}
      <section className="m-cats-wrap">
        <div className="k-wrap">
          <span className="m-eyebrow">Explorer</span>
          <h2 className="m-h2">Choisis ton <em>rayon</em>.</h2>
          <div className="m-cats">
            {categories.map((category, i) => (
              <Link className="m-cat" href={routes.category(category.slug)} key={category.slug} style={{ ['--tint' as string]: COLORS[i % COLORS.length] }}>
                <span className="m-cat-perf" aria-hidden="true" />
                <strong>{category.name}</strong>
                <span>{category.count} {category.count > 1 ? 'outils' : 'outil'} <Arrow /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Final */}
      <section className="m-final">
        <div className="k-wrap m-final-in">
          <h2 className="m-final-title">
            <span className="m-final-mask"><span className="m-final-line">Tu as vu passer</span></span>
            <span className="m-final-mask"><span className="m-final-line">un code dans <em>une vidéo</em>&nbsp;?</span></span>
          </h2>
          <p>Envoie-le avec le lien de la vidéo. On le vérifie, on crédite le créateur, et il aide les suivants.</p>
          <div className="m-final-actions">
            <Link className="k-btn k-btn-paper k-btn-ticket m-cta" href={routes.submit()}>Proposer un code <Arrow /></Link>
            <button type="button" className="k-btn k-btn-ghost m-rain-btn" onClick={rain}><Sparkle /> Fais pleuvoir les codes</button>
          </div>
          <div className="m-final-links">
            <button type="button" className="k-link m-replay" onClick={replayIntro}>Rejouer l&apos;entrée</button>
            <Link className="k-link" href={routes.home}>Revenir à l&apos;accueil classique</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
