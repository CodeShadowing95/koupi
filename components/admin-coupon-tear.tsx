'use client';
// Passage de la connexion à l'accueil admin : le coupon du logo Koupi grandit jusqu'à couvrir l'écran,
// l'accueil se charge derrière, puis le coupon se déchire le long de sa ligne pointillée (avec le son).
// Le coupon est ajouté directement dans <body>, hors de l'arbre React : le changement de page peut
// recréer la coque admin sans l'effacer. Ce composant, monté dans la coque, déclenche chaque étape.
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { gsap, MOTION_REDUCED } from '@/lib/gsap';
import { playCouponTear } from '@/lib/coupon-sound';

export const ADMIN_ENTER_EVENT = 'koupi-admin-enter';
/** Position du coupon du logo à l'écran : centre et rayon, en pixels. */
export type CouponOrigin = { x: number; y: number; r: number };

// Bord déchiré : une ligne en dents de scie autour du milieu (en % de la largeur du coupon).
const TEAR = Array.from({ length: 25 }, (_, i) => ({ x: 50 + (i % 2 ? 0.9 : -0.7) * (i % 3 === 0 ? 0.5 : 1), y: (i / 24) * 100 }));
const LEFT = `polygon(0% 0%, ${TEAR.map(p => `${p.x}% ${p.y}%`).join(', ')}, 0% 100%)`;
const RIGHT = `polygon(${TEAR.map(p => `${p.x}% ${p.y}%`).join(', ')}, 100% 100%, 100% 0%)`;
const WELCOME = 'Bienvenue dans la place.';

type Phase = 'growing' | 'covered' | 'tearing';
/** Le coupon en cours d'animation, partagé entre les montages successifs du composant. */
let overlay: HTMLDivElement | null = null;

function buildOverlay(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'ct';
  el.setAttribute('aria-hidden', 'true');
  for (const [side, clip] of [['ct-left', LEFT], ['ct-right', RIGHT]]) {
    const half = document.createElement('div');
    half.className = `ct-half ${side}`;
    half.style.clipPath = clip;
    el.append(half);
  }
  const text = document.createElement('span');
  text.className = 'ct-text';
  el.append(text);
  // Le coupon est hors de .admin-root : on lui recopie la police des titres.
  const root = document.querySelector('.admin-root');
  if (root) el.style.setProperty('--font-display', getComputedStyle(root).getPropertyValue('--font-display'));
  document.body.append(el);
  return el;
}

function setPhase(el: HTMLDivElement, phase: Phase) {
  el.dataset.phase = phase;
}

export function AdminCouponTear() {
  const router = useRouter();
  const pathname = usePathname();

  // 1. Le coupon part du logo et grandit jusqu'à couvrir tout l'écran, puis on ouvre l'accueil.
  useEffect(() => {
    function onEnter(event: Event) {
      if (window.matchMedia(MOTION_REDUCED).matches) { router.push('/admin'); return; }
      const origin = (event as CustomEvent<CouponOrigin>).detail;
      // L'événement part d'une animation de la page de connexion : lancé tel quel, notre coupon serait
      // rattaché à son contexte GSAP et remis à zéro quand cette page se démonte. On attend une image.
      requestAnimationFrame(() => grow(origin));
    }
    function grow(origin: CouponOrigin) {
      overlay?.remove();
      const el = (overlay = buildOverlay());
      const { innerWidth: w, innerHeight: h } = window;
      const size = Math.ceil(Math.hypot(w, h) * 1.08);
      gsap.set(el, {
        width: size, height: size, left: (w - size) / 2, top: (h - size) / 2,
        '--ct-notch': `${size * 0.09}px`, '--ct-dash': `${size / 13}px`, '--ct-dash-w': `${Math.max(3, size * 0.022)}px`,
      });
      setPhase(el, 'growing');
      const text = el.querySelector('.ct-text');
      gsap.timeline({ onComplete: () => { setPhase(el, 'covered'); router.push('/admin'); } })
        .fromTo(el, { x: origin.x - w / 2, y: origin.y - h / 2, scale: (origin.r * 2) / size, rotate: -25 }, { x: 0, y: 0, scale: 1, rotate: 0, duration: 0.95, ease: 'power3.inOut' })
        .fromTo(text, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, '-=0.25')
        .to(text, { duration: 0.6, scrambleText: { text: WELCOME, chars: 'KOUPI', speed: 0.8 } }, '<');
    }
    window.addEventListener(ADMIN_ENTER_EVENT, onEnter);
    return () => window.removeEventListener(ADMIN_ENTER_EVENT, onEnter);
  }, [router]);

  // 2. L'accueil est affiché derrière : le coupon se déchire et chaque moitié part de son côté.
  useEffect(() => {
    const el = overlay;
    if (!el || el.dataset.phase !== 'covered' || pathname !== '/admin') return;
    const timer = window.setTimeout(() => {
      setPhase(el, 'tearing');
      playCouponTear({ stamp: false });
      const width = el.offsetWidth;
      const [left, right, text] = ['.ct-left', '.ct-right', '.ct-text'].map(s => el.querySelector(s));
      gsap.timeline({ onComplete: () => { el.remove(); if (overlay === el) overlay = null; } })
        .to(text, { autoAlpha: 0, duration: 0.15 })
        .to(left, { x: -width * 0.02, rotate: -2, duration: 0.18, ease: 'power2.out' }, 0)
        .to(right, { x: width * 0.02, rotate: 2, duration: 0.18, ease: 'power2.out' }, 0)
        .to(left, { x: -width * 0.75, y: width * 0.08, rotate: -14, duration: 0.8, ease: 'power3.in' }, 0.2)
        .to(right, { x: width * 0.75, y: width * 0.12, rotate: 16, duration: 0.8, ease: 'power3.in' }, 0.24);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
