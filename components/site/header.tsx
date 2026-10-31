'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isSoundEnabled, setSoundEnabled } from '@/lib/coupon-sound';
import { routes } from '@/lib/routes';

const links = [
  { href: routes.categories, label: 'Catégories' },
  { href: routes.transparency, label: 'Transparence' },
  { href: routes.keyring, label: 'Mon trousseau' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [sound, setSound] = useState(true);

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
    <header className={`k-header${scrolled ? ' is-scrolled' : ''}`}>
      <a className="k-skip" href="#contenu">Aller au contenu</a>
      <div className="k-wrap k-header-in">
        <Link className="k-logo" href={routes.home} aria-label="Koupi, accueil">
          <Image src="/koupi-logo-dark.png" alt="Koupi" width={971} height={348} priority />
        </Link>
        <nav className="k-nav" aria-label="Navigation principale">
          {links.map(link => (
            <Link key={link.href} className="k-nav-link" href={link.href} aria-current={pathname.startsWith(link.href) ? 'page' : undefined}>{link.label}</Link>
          ))}
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
          <Link className="k-btn k-btn-paper k-btn-sm k-btn-ticket" href={routes.submit()} style={{ marginLeft: 6 }}>Proposer un code</Link>
        </nav>
      </div>
    </header>
  );
}
