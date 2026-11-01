'use client';
// Portail de connexion admin : un « pass » Koupi au milieu d'un comptoir de codes qui défilent.
// Animations GSAP (entrée, refus, entrée validée), toutes coupées si le système demande moins de mouvement.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gsap, MOTION_OK, MOTION_REDUCED, SplitText, useGSAP } from '@/lib/gsap';
import { primeSound } from '@/lib/coupon-sound';
import { ADMIN_ENTER_EVENT, type CouponOrigin } from '@/components/admin-coupon-tear';

// Codes décoratifs du fond : ils évoquent le catalogue sans en montrer un vrai.
const ROWS = [
  ['CREATEUR20', '-25 %', '3 MOIS OFFERTS', 'VÉRIFIÉ ✓', 'KOUPI10', '1 MOIS OFFERT', 'TESTÉ AUJOURD’HUI', '-40 %'],
  ['BIENVENUE', 'À TESTER', 'PODCAST15', '-30 %', 'SOURCE ✓', 'YOUTUBE20', 'CODE·CRÉATEUR', '2 MOIS'],
  ['-15 %', 'STORY10', 'VÉRIFIÉ ✓', 'ESSAI GRATUIT', 'KOUPI-ADMIN', '-50 %', 'LIEN CRÉATEUR', 'TIKTOK25'],
  ['6 MOIS -20 %', 'NEWSLETTER', 'À RETESTER', 'INSTA12', '-35 %', 'PUBLIÉ', 'CODE DU JOUR', 'OFFERT'],
  ['VIDEO30', 'MERCI ✓', '-10 %', 'PREMIUM', 'SNAP15', '1 AN -30 %', 'À VALIDER', 'KOUPI'],
  ['TESTÉ ✓', 'LIVE20', '-45 %', 'CRÉDITÉ', 'ABONNÉS', '-20 %', 'SOURCE VIDÉO', 'BONUS'],
];
// Code-barres du talon : largeurs fixes pour un rendu identique côté serveur et navigateur.
const BARS = [3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1];

type Status = 'idle' | 'checking' | 'error' | 'success';

function errorMessage(status: number) {
  if (status === 429) return 'Trop d’essais. Réessaie dans 15 minutes.';
  if (status === 503) return 'Connexion admin indisponible : configuration ou base de données manquante sur le serveur.';
  return 'Mot de passe incorrect.';
}

// Centre et rayon du coupon (le « o » du logo) : mesurés sur l'image du logo affichée (1100 × 480).
function couponOrigin(): CouponOrigin {
  const logo = [...document.querySelectorAll<HTMLImageElement>('.lp-logo')].find(img => img.getBoundingClientRect().width > 0);
  if (!logo) return { x: window.innerWidth / 2, y: window.innerHeight / 2, r: 20 };
  const box = logo.getBoundingClientRect();
  return { x: box.left + box.width * (417 / 1100), y: box.top + box.height * (258 / 480), r: box.height * (110 / 480) };
}

export function LoginPortal() {
  const scope = useRef<HTMLElement>(null);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  useEffect(() => { router.prefetch('/admin'); }, [router]);

  // Entrée en scène : le comptoir s'anime, le pass arrive, le titre se compose lettre par lettre.
  const { contextSafe } = useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      // Rangées de codes : défilement sans fin, sens alterné, vitesses différentes.
      gsap.utils.toArray<HTMLElement>('.lp-row-track').forEach((track, i) => {
        gsap.fromTo(track, { xPercent: i % 2 ? -50 : 0 }, { xPercent: i % 2 ? 0 : -50, duration: 38 + i * 9, ease: 'none', repeat: -1 });
      });
      // Halo qui suit la souris.
      gsap.set('.lp-glow', { x: window.innerWidth / 2, y: window.innerHeight * 0.45 });
      const xTo = gsap.quickTo('.lp-glow', 'x', { duration: 0.8, ease: 'power3' });
      const yTo = gsap.quickTo('.lp-glow', 'y', { duration: 0.8, ease: 'power3' });
      const move = (event: PointerEvent) => { xTo(event.clientX); yTo(event.clientY); };
      window.addEventListener('pointermove', move);

      const split = SplitText.create('.lp-title', { type: 'words,chars', mask: 'chars' });
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .from('.lp-row', { autoAlpha: 0, y: 30, stagger: 0.08, duration: 0.8 })
        .from('.lp-pass', { y: 120, rotate: -9, autoAlpha: 0, duration: 1, ease: 'back.out(1.4)' }, 0.15)
        .from('.lp-hole', { scale: 0, stagger: { each: 0.03, from: 'center' }, duration: 0.3, ease: 'back.out(3)' }, 0.6)
        .to('.lp-kicker-text', { duration: 0.9, scrambleText: { text: 'Accès réservé · Admin', chars: 'KOUPI0123456789', speed: 0.6 } }, 0.55)
        .from(split.chars, { yPercent: 110, stagger: 0.022, duration: 0.6 }, 0.7)
        .from('.lp-reveal', { y: 16, autoAlpha: 0, stagger: 0.08, duration: 0.5 }, 1)
        .from('.lp-bar', { scaleY: 0, transformOrigin: 'bottom', stagger: 0.015, duration: 0.25 }, 0.9)
        .from('.lp-stub-text', { autoAlpha: 0, x: 12, duration: 0.5 }, 1.1);
      // Le voyant « portail ouvert » respire.
      gsap.to('.lp-lamp', { scale: 1.8, autoAlpha: 0, duration: 1.4, repeat: -1, ease: 'power1.out' });

      return () => { window.removeEventListener('pointermove', move); split.revert(); };
    });
      }, { scope });

  // Chaque frappe fait battre le talon du pass.
  const pulse = contextSafe(() => {
    if (window.matchMedia(MOTION_REDUCED).matches) return;
    gsap.fromTo('.lp-stub', { backgroundColor: 'var(--lp-pulse)' }, { backgroundColor: 'var(--lp-stub)', duration: 0.5, ease: 'power2.out', overwrite: true });
  });

  const refusal = useRef<gsap.core.Timeline | null>(null);
  const clearRefusal = contextSafe(() => {
    refusal.current?.kill();
    gsap.set('.lp-stamp-bad', { autoAlpha: 0 });
  });
  const refuse = contextSafe(() => {
    if (window.matchMedia(MOTION_REDUCED).matches) return;
    refusal.current?.kill();
    refusal.current = gsap.timeline()
      .to('.lp-pass', { keyframes: { x: [0, -14, 12, -9, 6, -3, 0] }, duration: 0.5, ease: 'power1.inOut' })
      .fromTo('.lp-stamp-bad', { autoAlpha: 0, scale: 2.4, rotate: -24 }, { autoAlpha: 1, scale: 1, rotate: -12, duration: 0.35, ease: 'back.out(2)' }, 0)
      .to('.lp-stamp-bad', { autoAlpha: 0, duration: 0.4, delay: 1.1 });
  });

  // Entrée validée : tampon, le talon se détache, puis le coupon du logo prend tout l'écran
  // et se déchire sur l'accueil admin (AdminCouponTear, dans la coque admin).
  const enter = contextSafe(() => {
    if (window.matchMedia(MOTION_REDUCED).matches) { router.push('/admin'); return; }
    clearRefusal();
    gsap.timeline({ onComplete: () => window.dispatchEvent(new CustomEvent<CouponOrigin>(ADMIN_ENTER_EVENT, { detail: couponOrigin() })) })
      .fromTo('.lp-stamp-ok', { autoAlpha: 0, scale: 3, rotate: 8 }, { autoAlpha: 1, scale: 1, rotate: -10, duration: 0.32, ease: 'power4.in' })
      .to('.lp-pass', { scale: 0.97, duration: 0.08, yoyo: true, repeat: 1 }, '>-0.02')
      .to('.lp-stub', { rotate: 22, x: 40, y: 260, autoAlpha: 0, duration: 0.8, ease: 'power2.in', transformOrigin: 'top left' }, '+=0.15')
      .to('.lp-row-track', { timeScale: 4, duration: 0.6 }, '<')
      .to(document.querySelector('.lp-theme'), { autoAlpha: 0, duration: 0.2 }, '<')
      .to('.lp-logo', { scale: 1.12, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.inOut', transformOrigin: '38% 54%' }, '-=0.35');
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status === 'checking' || status === 'success') return;
    primeSound(); // geste de l'utilisateur : le son de la déchirure pourra jouer ensuite
    setStatus('checking');
    setError('');
    try {
      const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
      if (response.ok) { setStatus('success'); enter(); return; }
      setError(errorMessage(response.status));
    } catch {
      setError('Connexion impossible. Vérifie ta connexion.');
    }
    setStatus('error');
    refuse();
  }

  function onKey(event: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState?.('CapsLock') ?? false);
  }

  return (
    <main ref={scope} className="lp">
      <div className="lp-floor" aria-hidden="true">
        {ROWS.map((row, i) => (
          <div className="lp-row" key={i}>
            <div className="lp-row-track">
              {[...row, ...row].map((code, j) => <span className="lp-tag" key={j}>{code}</span>)}
            </div>
          </div>
        ))}
      </div>
      <div className="lp-glow" aria-hidden="true" />

      <section className="lp-pass" aria-labelledby="lp-title">
        <div className="lp-main">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lp-logo adm-logo-light" src="/koupi-logo.png" alt="Koupi" width={1100} height={480} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lp-logo adm-logo-dark" src="/koupi-logo-dark.png" alt="" width={1100} height={480} />
          <p className="lp-kicker"><span className="lp-lamp-wrap" aria-hidden="true"><span className="lp-lamp" /><span className="lp-lamp-core" /></span><span className="lp-kicker-text">Accès réservé · Admin</span></p>
          <h1 id="lp-title" className="lp-title">Bon retour au comptoir.</h1>
          <p className="lp-sub lp-reveal">Ton espace pour vérifier, publier et faire grandir Koupi.</p>

          <form className="lp-form lp-reveal" onSubmit={submit}>
            <label htmlFor="password" className="lp-label">Mot de passe</label>
            <div className="lp-field">
              <input
                id="password" type={visible ? 'text' : 'password'} value={password} required autoFocus autoComplete="current-password"
                onChange={event => { setPassword(event.target.value); pulse(); if (status === 'error') { setStatus('idle'); clearRefusal(); } }}
                onKeyDown={onKey} onKeyUp={onKey} aria-invalid={status === 'error'} aria-describedby="lp-help" disabled={status === 'success'}
              />
              <button type="button" className="lp-eye" onClick={() => setVisible(value => !value)} aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={visible}>
                {visible
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2.5 12S6 19 12 19a9.6 9.6 0 0 0 4.4-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" /><circle cx="12" cy="12" r="3" /></svg>}
              </button>
            </div>
            <p id="lp-help" className="lp-help" role="status">
              {error ? <span className="lp-error">{error}</span> : capsLock ? <span className="lp-caps">Verr. Maj est activé.</span> : status === 'success' ? 'Accès validé.' : ' '}
            </p>
            <button className="lp-submit" type="submit" disabled={status === 'checking' || status === 'success'}>
              <span>{status === 'checking' ? 'Vérification…' : status === 'success' ? 'Entrée…' : 'Entrer'}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
            </button>
          </form>
        </div>

        <div className="lp-perf" aria-hidden="true">{Array.from({ length: 11 }, (_, i) => <span className="lp-hole" key={i} />)}</div>

        <div className="lp-stub" aria-hidden="true">
          <span className="lp-stub-text lp-stub-label">Pass</span>
          <span className="lp-stub-text lp-stub-big">ADMIN</span>
          <span className="lp-stub-text lp-stub-serial">N° 0001</span>
          <span className="lp-barcode">{BARS.map((width, i) => <span className="lp-bar" key={i} style={{ width }} />)}</span>
        </div>

        <span className="lp-stamp lp-stamp-ok" aria-hidden="true">Accès validé</span>
        <span className="lp-stamp lp-stamp-bad" aria-hidden="true">Refusé</span>
      </section>

    </main>
  );
}
