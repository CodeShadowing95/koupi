'use client';
// En-tête et pied de page du back-office (interface claire d'origine).
// La navigation mène aux pages admin : plus besoin de taper /admin dans l'adresse.
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin', label: 'Tableau de bord' },
  { href: '/admin/codes', label: 'Codes' },
  { href: '/admin/propositions', label: 'Propositions' },
];

export function Header() {
  const pathname = usePathname();
  const isLogin = pathname.startsWith('/admin/login');
  return (
    <header className="site-header admin-header">
      <div className="container header-inner">
        <Link className="header-logo" href={isLogin ? '/' : '/admin'} aria-label="Koupi, tableau de bord admin">
          <Image className="logo" src="/koupi-logo.png" alt="Koupi" width={1100} height={480} priority />
          <span className="admin-badge">Admin</span>
        </Link>
        <nav className="nav" aria-label="Navigation admin">
          {!isLogin && links.map(link => {
            const active = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
            return <Link key={link.href} href={link.href} className={active ? 'nav-strong admin-active' : undefined} aria-current={active ? 'page' : undefined}>{link.label}</Link>;
          })}
          <Link href="/" target="_blank" rel="noopener noreferrer">Voir le site ↗</Link>
          {!isLogin && (
            <form method="post" action="/api/admin/logout">
              <button className="nav-cta" type="submit">Se déconnecter</button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>Koupi · back-office</p>
        <nav className="footer-links" aria-label="Liens du pied de page">
          <Link href="/">Site public</Link>
          <Link href="/legal">Mentions légales</Link>
        </nav>
      </div>
    </footer>
  );
}
