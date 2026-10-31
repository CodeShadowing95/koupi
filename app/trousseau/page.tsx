import Link from 'next/link';

export default function Trousseau() {
  return (
    <main className="page">
      <div className="container split">
        <div className="page-head" style={{ marginBottom: 0 }}>
          <span className="eyebrow">Sans compte</span>
          <h1>Ton trousseau</h1>
          <p className="hero-copy">Garde les créateurs que tu suis à portée de main. On mettra leurs codes en premier. Tout reste dans ton navigateur, sur cet ordinateur.</p>
        </div>
        <div className="card card-strong">
          <h2>Ton trousseau est vide</h2>
          <p>Ouvre la page d&apos;un créateur et ajoute-le pour retrouver ses codes ici.</p>
          <Link className="btn b-ink" href="/categories">Trouver un créateur</Link>
        </div>
      </div>
    </main>
  );
}
