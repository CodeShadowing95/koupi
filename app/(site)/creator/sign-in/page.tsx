import type { Metadata } from 'next';
import { CreatorSignInLanding } from '@/components/site/creator-sign-in-landing';

export const metadata: Metadata = { title: 'Connexion · Koupi', robots: { index: false, follow: false } };

// Arrivée depuis le lien reçu par e-mail. La connexion se fait en POST depuis la page (voir ADR-0021).
export default async function CreatorSignInPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main className="k-page">
      <div className="k-wrap k-fc-landing">
        <CreatorSignInLanding token={typeof token === 'string' ? token.slice(0, 200) : ''} />
      </div>
    </main>
  );
}
