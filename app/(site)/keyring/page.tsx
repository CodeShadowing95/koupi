import Link from 'next/link';
import { routes } from '@/lib/routes';

export const metadata = { title: 'Mon trousseau · Koupi' };

export default function Keyring() {
  return (
    <main className="k-page">
      <div className="k-wrap k-split">
        <div className="k-page-head" style={{ marginBottom: 0 }}>
          <span className="k-eyebrow">Sans compte</span>
          <h1>Ton trousseau</h1>
          <p>Garde les créateurs que tu suis à portée de main. On mettra leurs codes en premier. Tout reste dans ton navigateur, sur cet ordinateur.</p>
        </div>
        <div className="k-empty" data-reveal>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8C9BFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4" /><path d="m10.85 12.15 8.65-8.65M18 5l2 2M15 8l2 2" /></svg>
          <h2>Ton trousseau est vide</h2>
          <p>Ouvre la page d&apos;un créateur et ajoute-le pour retrouver ses codes ici.</p>
          <Link className="k-btn k-btn-paper k-btn-ticket" href={routes.categories}>Trouver un créateur</Link>
        </div>
      </div>
    </main>
  );
}
