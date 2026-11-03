import type { Metadata } from 'next';
import Link from 'next/link';
import { isPublic } from '@/lib/data';
import { getCatalog, getCreatorFacts, getCreatorProfile } from '@/lib/catalog-server';
import { currentCreatorAccount } from '@/lib/creator-current';
import { routes } from '@/lib/routes';
import { plural } from '@/lib/ui';
import { Counter } from '@/components/site/counter';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { CreatorSignIn } from '@/components/site/creator-sign-in';
import { PlatformIcon } from '@/components/platform-icon';

export const metadata: Metadata = {
  title: 'Pour les créateurs · Koupi',
  description: 'Tes codes promo sont déjà sur Koupi, avec la vidéo d’où ils viennent. Vois combien de fois ils sont copiés, gratuitement.',
  alternates: { canonical: routes.forCreators() },
};

// Accueil des créateurs (ADR-0021). Un créateur vient de YouTube, pressé : il voit d'abord SES chiffres,
// puis un seul champ. Pas de mot de passe, pas de formulaire long.
export default async function ForCreators({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const [{ codes }, account] = await Promise.all([getCatalog(), currentCreatorAccount()]);
  const match = typeof c === 'string' ? codes.find(code => code.creatorSlug === c) : undefined;
  const own = match ? codes.filter(code => code.creatorSlug === match.creatorSlug && isPublic(code)) : [];
  const [facts, profile] = match ? await Promise.all([getCreatorFacts(), getCreatorProfile(match.creatorSlug)]) : [null, null];
  const copies = match ? facts?.[match.creatorSlug]?.copies ?? 0 : 0;
  const tools = [...new Set(own.map(code => code.tool))];

  return (
    <main className="k-page k-fc">
      <div className="k-wrap k-fc-grid">
        <section className="k-fc-pitch">
          <span className="k-eyebrow">Pour les créateurs</span>
          {match ? (
            <>
              <div className="k-fc-who">
                <CreatorAvatar name={match.creator} size="lg" />
                <div>
                  <h1>{match.creator},</h1>
                  {profile && profile.accounts.length > 0 && (
                    <ul className="k-fc-networks" aria-label="Tes comptes">
                      {profile.accounts.map(item => <li key={`${item.platform}-${item.handle}`}><PlatformIcon platform={item.platform} size={22} className="k-platform-icon" /><span>{item.handle}</span></li>)}
                    </ul>
                  )}
                </div>
              </div>
              {copies > 0 ? (
                <p className="k-fc-big">tes codes ont été copiés <b><Counter value={copies} group /> fois</b> ce mois-ci sur Koupi.</p>
              ) : (
                <p className="k-fc-big"><b>{plural(own.length, 'de tes codes est', 'de tes codes sont')}</b> déjà sur Koupi, chacun avec la vidéo d’où il vient.</p>
              )}
              {tools.length > 0 && <p className="k-fc-tools">{tools.slice(0, 4).join(', ')}{tools.length > 4 ? ` et ${tools.length - 4} autre${tools.length > 5 ? 's' : ''}` : ''}.</p>}
            </>
          ) : (
            <>
              <h1 className="k-fc-title">Tes codes promo, <span>enfin chez toi.</span></h1>
              <p className="k-fc-big">Koupi rassemble les codes que tu donnes dans tes vidéos, avec la vidéo d’où ils viennent. Vois combien de fois ils sont copiés, gratuitement.</p>
            </>
          )}
        </section>

        <section className="k-panel k-panel-glow k-fc-card" aria-labelledby="fc-card-title">
          {account ? (
            <>
              <h2 id="fc-card-title">Tu es déjà connecté.</h2>
              <p>Avec {account.email}.</p>
              <Link className="k-btn k-btn-primary" href={routes.creatorSpace}>Aller à mon espace</Link>
            </>
          ) : (
            <>
              <h2 id="fc-card-title">{match ? 'C’est ta page ? Entre dans ton espace.' : 'Entre dans ton espace créateur.'}</h2>
              <p>{match ? 'Laisse ton e-mail : tu reçois un lien pour te connecter. On vérifie ensuite avec toi que la chaîne est bien la tienne.' : 'Laisse ton e-mail : tu reçois un lien pour te connecter, en dix secondes.'}</p>
              <CreatorSignIn slug={match?.creatorSlug ?? null} name={match?.creator ?? null} />
            </>
          )}
        </section>
        <ul className="k-fc-perks" aria-label="Ce que tu y gagnes">
          <li><span aria-hidden="true">01</span><div><b>Tes copies, code par code</b><p>Chaque mois, combien de personnes ont copié chacun de tes codes.</p></div></li>
          <li><span aria-hidden="true">02</span><div><b>Une page vérifiée à ton nom</b><p>La coche « Créateur vérifié » et un lien unique à mettre dans tes descriptions.</p></div></li>
          <li><span aria-hidden="true">03</span><div><b>Gratuit, sans engagement</b><p>Pas de mot de passe, pas de carte bancaire. Tu pars quand tu veux.</p></div></li>
        </ul>
      </div>
    </main>
  );
}
