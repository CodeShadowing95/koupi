'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { gsap, MOTION_OK, MOTION_REDUCED, useGSAP } from '@/lib/gsap';
import { copyText, openCreatorLink } from '@/lib/copy';
import { playCouponSnip, playCouponTear } from '@/lib/coupon-sound';
import { resist, tearDecision } from '@/lib/tear';

type TicketProps = {
  code: string;
  link: string;
  creator: string;
  discount: string;
  tool: string;
  children: React.ReactNode;
};

/** Le grand coupon de la fiche outil : on détache le talon pour copier le code. */
export function TearTicket({ code, link, creator, discount, tool, children }: TicketProps) {
  const root = useRef<HTMLDivElement>(null);
  const stub = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ start: number; t: number; d: number; v: number; moved: boolean; vertical: boolean } | null>(null);
  const swallowClick = useRef(false);
  const [torn, setTorn] = useState(false);
  const [failed, setFailed] = useState(false);
  const { contextSafe } = useGSAP({ scope: root });

  const animateTear = contextSafe((vertical: boolean) => {
    const el = stub.current;
    const box = root.current;
    if (!el || !box) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const tl = gsap.timeline();
      tl.to(el, { x: 2, duration: 0.04, repeat: 5, yoyo: true, ease: 'none' })
        .to(el, vertical ? { y: 30, x: 10, rotation: 3, duration: 0.6, ease: 'power3.out' } : { x: 30, y: 16, rotation: 5, duration: 0.6, ease: 'power3.out' })
        .fromTo('.k-stamp', { scale: 2.3, opacity: 0, rotation: -4 }, { scale: 1, opacity: 0.92, rotation: -12, duration: 0.42, ease: 'back.out(3)' }, '-=0.18')
        .fromTo('.k-ticket-main', { y: 0 }, { y: 4, duration: 0.07, yoyo: true, repeat: 1, ease: 'power1.inOut' }, '<0.12');
      // Confettis de perforation qui s'échappent le long de la ligne pointillée.
      const layer = box.querySelector<HTMLElement>('.k-confetti');
      if (layer) {
        layer.replaceChildren();
        const line = vertical ? el.offsetTop : el.offsetLeft;
        const span = vertical ? box.offsetWidth : box.offsetHeight;
        for (let i = 0; i < 18; i++) {
          const dot = document.createElement('i');
          const along = (i / 17) * span;
          dot.style.left = `${vertical ? along : line - 3}px`;
          dot.style.top = `${vertical ? line - 3 : along}px`;
          dot.style.background = i % 3 === 0 ? '#FF6A3D' : i % 3 === 1 ? '#FFF7E8' : '#8C9BFF';
          layer.appendChild(dot);
          gsap.to(dot, {
            duration: 1.1 + Math.random() * 0.5,
            physics2D: { velocity: 180 + Math.random() * 260, angle: vertical ? 200 + Math.random() * 140 : -150 + Math.random() * 120, gravity: 900 },
            opacity: 0,
            scale: 0.4,
            ease: 'none',
            onComplete: () => dot.remove(),
          });
        }
      }
    });
    mm.add(MOTION_REDUCED, () => {
      gsap.set(el, vertical ? { y: 14 } : { x: 14, rotation: 3 });
      gsap.set('.k-stamp', { opacity: 0.92, scale: 1, rotation: -12 });
    });
  });

  const tear = contextSafe(async (vertical: boolean) => {
    if (torn) {
      // Talon déjà détaché : on recopie simplement le code.
      playCouponSnip();
      const ok = await copyText(code);
      setFailed(!ok);
      gsap.fromTo(stub.current, { rotation: '+=0' }, { rotation: '+=3', duration: 0.08, yoyo: true, repeat: 3 });
      return;
    }
    const copying = copyText(code);
    playCouponTear();
    setTorn(true);
    animateTear(vertical);
    const ok = await copying;
    setFailed(!ok);
    // Le temps de voir le coupon se détacher, puis on ouvre le lien du créateur.
    window.setTimeout(() => openCreatorLink(link), 850);
  });

  const isVertical = () => window.matchMedia('(max-width: 640px)').matches;

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (torn || event.button !== 0) return;
    const vertical = isVertical();
    drag.current = { start: vertical ? event.clientY : event.clientX, t: performance.now(), d: 0, v: 0, moved: false, vertical };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    const el = stub.current;
    if (!d || !el) return;
    const now = performance.now();
    const distance = Math.max(0, (d.vertical ? event.clientY : event.clientX) - d.start);
    d.v = (distance - d.d) / Math.max(1, now - d.t);
    d.t = now;
    d.d = distance;
    if (distance > 4) d.moved = true;
    const size = d.vertical ? el.offsetHeight : el.offsetWidth;
    const shown = resist(distance, size);
    gsap.set(el, d.vertical ? { y: shown, rotation: (shown / size) * 4 } : { x: shown, rotation: (shown / size) * 7 });
  };
  const onPointerUp = () => {
    const d = drag.current;
    const el = stub.current;
    drag.current = null;
    if (!d || !el) return;
    if (!d.moved) return;
    swallowClick.current = true;
    if (tearDecision(d.d, d.v, d.vertical ? el.offsetHeight : el.offsetWidth)) void tear(d.vertical);
    else gsap.to(el, { x: 0, y: 0, rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
  };
  const onClick = () => {
    if (swallowClick.current) { swallowClick.current = false; return; }
    void tear(isVertical());
  };
  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = root.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    box.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
  };

  return (
    <div>
      <div className="k-ticket" ref={root} onPointerMove={onMove}>
        <div className="k-ticket-main k-paper">
          {children}
          <div className="k-stamp" aria-hidden="true"><span>Copié</span></div>
        </div>
        <button
          ref={stub}
          type="button"
          className={`k-ticket-stub${torn ? ' is-torn' : ''}`}
          aria-label={torn ? `Recopier le code ${code}` : `Détacher le coupon : copie le code ${code} et ouvre ${tool}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={onClick}
        >
          <span className="k-ticket-foil" aria-hidden="true" />
          <span className="k-ticket-label">Code promo</span>
          <span className="k-ticket-code">{code}</span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="k-ticket-action">{torn ? 'Recopier' : 'Copier et ouvrir'}</span>
            {!torn && (
              <span className="k-ticket-hint">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                ou tire le talon pour le détacher
              </span>
            )}
          </span>
        </button>
        <div className="k-confetti" aria-hidden="true" />
      </div>
      <div role="status" aria-live="polite">
        {torn && (
          <div className="k-toast">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
            <div>
              <p><strong>{failed ? `Copie le code ${code} à la main.` : `Code ${code} copié.`}</strong> {creator} touche sa commission, toi tu gardes ta réduction ({discount}).</p>
              <div className="k-receipt">
                <a className="k-btn k-btn-primary k-btn-sm" href={link} target="_blank" rel="noopener noreferrer">Ouvrir {tool} ↗</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type MiniProps = {
  code: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  avatar?: React.ReactNode;
  className?: string;
} & ({ href: string; link?: never } | { link: string; href?: never });

/** Petit coupon : soit un lien vers la fiche (href), soit une copie rapide du code (link). */
export function MiniCoupon({ code, title, subtitle, avatar, className = '', href, link }: MiniProps) {
  const root = useRef<HTMLDivElement>(null);
  const stubRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  const { contextSafe } = useGSAP({ scope: root });

  const copy = contextSafe(async () => {
    const copying = copyText(code);
    playCouponSnip();
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.timeline()
        .to(stubRef.current, { x: 12, y: 6, rotation: 7, duration: 0.28, ease: 'power3.out' })
        .to(stubRef.current, { x: 0, y: 0, rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' }, '+=0.5');
    });
    setCopied(true);
    await copying;
    window.setTimeout(() => openCreatorLink(link ?? ''), 450);
    window.setTimeout(() => setCopied(false), 2400);
  });

  const body = (
    <>
      <div className="k-coupon-main k-paper">
        {avatar}
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </span>
      </div>
      {href ? (
        <span className="k-coupon-stub"><small>Code</small><span className="k-coupon-code">{code}</span></span>
      ) : (
        <button ref={stubRef} type="button" className="k-coupon-stub" onClick={copy} aria-label={`Copier le code ${code} et ouvrir le lien du créateur`}>
          <small>{copied ? 'Copié ✓' : 'Copier'}</small>
          <span className="k-coupon-code">{code}</span>
        </button>
      )}
      <span className="k-sr" role="status">{copied ? `Code ${code} copié` : ''}</span>
    </>
  );

  if (href) {
    return <Link href={href} className={`k-coupon ${className}`} ref={root as unknown as React.Ref<HTMLAnchorElement>}>{body}</Link>;
  }
  return <div className={`k-coupon ${className}`} ref={root}>{body}</div>;
}
