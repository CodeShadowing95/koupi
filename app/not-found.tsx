import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page">
      <div className="container page-head">
        <span className="eyebrow">Erreur 404</span>
        <h1>Ce ticket ne mène nulle part.</h1>
        <p className="hero-copy">La page n&apos;existe pas ou plus. Cherche un outil depuis l&apos;accueil.</p>
        <Link className="btn b-ink" href="/" style={{ alignSelf: 'flex-start' }}>Retour à l&apos;accueil</Link>
      </div>
    </main>
  );
}
