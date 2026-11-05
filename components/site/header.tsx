'use client';
import Link, { useIsOff } from '@/components/site/site-pages';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { isSoundEnabled, setSoundEnabled } from '@/lib/coupon-sound';
import { routes } from '@/lib/routes';

// Sous 980 px, les liens passent dans un menu déroulant ouvert par le bouton burger :
// il se ferme au changement de page, avec Échap, au clic à côté, et bloque le défilement de la page derrière.

const links = [
  { href: routes.codes, label: 'Codes promo' },
  { href: routes.creators(), label: 'Créateurs' },
  { href: routes.feedback, label: 'Ton avis' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isOff = useIsOff();
  const shown = links.filter(link => !isOff(link.href));
  // « Ton avis » emporte la page en cours : l'admin voit d'où venait la remarque.
  const hrefOf = (href: string) => (href === routes.feedback && pathname !== routes.feedback ? `${href}?from=${encodeURIComponent(pathname)}` : href);
  const [scrolled, setScrolled] = useState(false);
  const [sound, setSound] = useState(true);
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const burger = useRef<HTMLButtonElement>(null);

  // Un changement de page referme le menu.
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); burger.current?.focus(); } };
    const onClick = (event: MouseEvent) => { if (!header.current?.contains(event.target as Node)) setOpen(false); };
    // Revenu en grand écran, le menu n'a plus lieu d'être.
    const wide = window.matchMedia('(min-width: 981px)');
    const onWide = () => { if (wide.matches) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    wide.addEventListener('change', onWide);
    document.documentElement.classList.add('k-menu-lock');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      wide.removeEventListener('change', onWide);
      document.documentElement.classList.remove('k-menu-lock');
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    setSound(isSoundEnabled());
    const onSound = (event: Event) => setSound((event as CustomEvent<boolean>).detail);
    window.addEventListener('koupi-sound-change', onSound);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('koupi-sound-change', onSound); };
  }, []);

  return (
    <header ref={header} className={`k-header${scrolled || open ? ' is-scrolled' : ''}${open ? ' is-menu-open' : ''}`}>
      <a className="k-skip" href="#contenu">Aller au contenu</a>
      <div className="k-wrap k-header-in">
        <Link className="k-logo" href={routes.home} aria-label="Merkod, accueil">
          <Image src="/merkod-logo-dark.png" alt="Merkod" width={1323} height={287} priority />
        </Link>
        <nav className="k-nav" aria-label="Navigation principale">
          {shown.map(link => (
            <Link key={link.href} className="k-nav-link" href={hrefOf(link.href)} aria-current={pathname.startsWith(link.href) ? 'page' : undefined}>{link.label}</Link>
          ))}
          {/* Un vrai petit coupon : papier crème festonné, perforation, talon corail « % » qui se décolle au survol. */}
          <Link className="k-nav-coupon" href={routes.submit()}>
            <span className="k-nav-coupon-main k-paper">Proposer un code</span>
            <span className="k-nav-coupon-stub" aria-hidden="true">%</span>
          </Link>
          <button
            type="button"
            className="k-icon-btn"
            aria-pressed={sound}
            aria-label={sound ? 'Couper le son des coupons' : 'Activer le son des coupons'}
            title={sound ? 'Son des coupons : activé' : 'Son des coupons : coupé'}
            onClick={() => setSoundEnabled(!sound)}
          >
            {sound ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a10 10 0 0 1 0 14" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="m22 9-6 6" /><path d="m16 9 6 6" /></svg>
            )}
          </button>
          <button
            ref={burger}
            type="button"
            className="k-icon-btn k-burger"
            aria-expanded={open}
            aria-controls="k-menu"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setOpen(value => !value)}
          >
            <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
          </button>
        </nav>
      </div>
      <div className="k-menu" id="k-menu" data-open={open} inert={!open}>
        <nav className="k-wrap k-menu-in" aria-label="Menu">
          {shown.map(link => (
            <Link key={link.href} className="k-menu-link" href={hrefOf(link.href)} aria-current={pathname.startsWith(link.href) ? 'page' : undefined}
              onClick={() => setOpen(false)}>
              {link.label}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          ))}
          <Link className="k-nav-coupon is-large k-menu-coupon" href={routes.submit()} onClick={() => setOpen(false)}>
            <span className="k-nav-coupon-main k-paper">Proposer un code</span>
            <span className="k-nav-coupon-stub" aria-hidden="true">%</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
