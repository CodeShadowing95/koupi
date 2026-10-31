import Link from 'next/link';
import Image from 'next/image';

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="header-logo" href="/" aria-label="Koupi, accueil">
          <Image className="logo" src="/koupi-logo.png" alt="Koupi" width={1100} height={480} priority />
        </Link>
        <nav className="nav" aria-label="Navigation principale">
          <Link href="/categories">Catégories</Link>
          <Link href="/transparence">Comment on gagne de l&apos;argent</Link>
          <Link className="nav-strong" href="/trousseau">Mon trousseau</Link>
          <Link className="nav-cta" href="/proposer">Proposer un code</Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <Image className="logo" src="/koupi-logo.png" alt="Koupi" width={1100} height={480} />
          <p>Le code du créateur. Crédité, vérifié.</p>
        </div>
        <nav className="footer-links" aria-label="Liens du pied de page">
          <Link href="/transparence">Transparence</Link>
          <Link href="/proposer">Proposer un code</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/confidentialite">Confidentialité</Link>
        </nav>
      </div>
    </footer>
  );
}
