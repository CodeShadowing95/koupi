import type { Metadata } from 'next';
import Link from '@/components/site/site-pages';
import { redirect } from 'next/navigation';
import { getDb } from '@/db';
import { isPublic, type Code } from '@/lib/data';
import { getCatalog } from '@/lib/catalog-server';
import { copiesByCode } from '@/lib/creator-auth';
import { currentCreatorAccount } from '@/lib/creator-current';
import { formatCopies } from '@/lib/creator-page';
import { routes } from '@/lib/routes';
import { Counter } from '@/components/site/counter';
import { CodeBadge } from '@/components/site/code-badge';
import { TrustPill } from '@/components/site/trust';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { CopyPageLink, SignOutButton } from '@/components/site/creator-space-actions';

export const metadata: Metadata = { title: 'Mon espace · Merkod', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

// Mêmes mots et mêmes pastilles que sur le site public ; « En relecture » et « Retiré » n'existent qu'ici.
function CodeState({ code }: { code: Code }) {
  if (code.status === 'pending') return <TrustPill seal="to_test" label="En relecture" title="Merkod relit ce code avant de le publier." dark />;
  if (code.status === 'rejected') return <TrustPill seal="expired" label="Retiré" title="Ce code n’est plus affiché sur Merkod." dark />;
  return <CodeBadge code={code} dark withDate={false} />;
}

// Espace du créateur connecté (ADR-0021). Première version : ses chiffres et ses codes, rien à configurer.
export default async function CreatorSpace() {
  const account = await currentCreatorAccount();
  if (!account) redirect(routes.forCreators());

  const { codes } = await getCatalog();
  const head = (
    <div className="k-cs-top">
      <span className="k-eyebrow">Mon espace</span>
      <span className="k-cs-who">{account.email} · <SignOutButton /></span>
    </div>
  );

  if (!account.creator) {
    return (
      <main className="k-page">
        <div className="k-wrap k-cs">
          {head}
          <h1 className="k-cs-title">{account.claims.length ? 'On vérifie que c’est bien toi.' : 'Bienvenue sur Merkod.'}</h1>
          {account.claims.length > 0 ? (
            <>
              <p className="k-cs-lead">Ta demande pour {account.claims.map(claim => claim.name).join(', ')} est bien arrivée. Dès que c’est vérifié, tes chiffres s’affichent ici.</p>
              <ol className="k-cs-steps">
                <li className="is-done"><b>Demande reçue</b><span>Tu es connecté avec {account.email}.</span></li>
                <li className="is-now"><b>Preuve par ta bio</b><span>On t’envoie un petit code à coller dans la description de ta chaîne. Seul le vrai propriétaire peut le faire.</span></li>
                <li><b>Ton espace s’ouvre</b><span>Copies code par code, page « Créateur vérifié », lien à partager.</span></li>
              </ol>
              <div className="k-cs-actions">
                {account.claims.map(claim => <Link key={claim.slug} className="k-btn k-btn-ghost" href={routes.creator(claim.slug)}>Voir la page {claim.name}</Link>)}
              </div>
            </>
          ) : (
            <>
              <p className="k-cs-lead">Ton compte est créé, mais il n’est relié à aucune page. Trouve la tienne et clique « C’est ta page ? ».</p>
              <div className="k-cs-actions"><Link className="k-btn k-btn-primary" href={routes.creators()}>Trouver ma page</Link></div>
            </>
          )}
        </div>
      </main>
    );
  }

  const creator = account.creator;
  const own = codes.filter(code => code.creatorSlug === creator.slug && (isPublic(code) || code.status === 'pending'));
  const copies = await copiesByCode(getDb(), creator.id);
  const rows = own.map(code => ({ code, copies: copies.get(code.id) ?? 0 })).sort((a, b) => b.copies - a.copies || a.code.tool.localeCompare(b.code.tool, 'fr'));
  const total = rows.reduce((sum, row) => sum + row.copies, 0);

  return (
    <main className="k-page">
      <div className="k-wrap k-cs">
        {head}
        <header className="k-cs-hero">
          <CreatorAvatar name={creator.name} size="lg" />
          <div>
            <h1 className="k-cs-title">{creator.name}</h1>
            <p className="k-cs-big"><b><Counter value={total} group /></b> {total > 1 ? 'copies' : 'copie'} de tes codes ce mois-ci</p>
          </div>
          <div className="k-cs-actions">
            <CopyPageLink path={routes.creator(creator.slug)} />
            <Link className="k-btn k-btn-ghost" href={routes.creator(creator.slug)}>Voir ma page</Link>
          </div>
        </header>

        <section aria-labelledby="cs-codes">
          <h2 id="cs-codes" className="k-cs-h2">Mes codes</h2>
          {rows.length === 0 ? <p className="k-cs-lead">Aucun code pour l’instant.</p> : (
            <div className="k-cs-table" role="table" aria-label="Mes codes et leurs copies ce mois-ci">
              <div role="row" className="k-cs-row is-head"><span role="columnheader">Code</span><span role="columnheader">Outil</span><span role="columnheader">État</span><span role="columnheader">Copies ce mois-ci</span></div>
              {rows.map(({ code, copies: n }) => (
                <div role="row" className="k-cs-row" key={code.id}>
                  <span role="cell" className="k-cs-code">{code.code || 'Lien seul'}</span>
                  <span role="cell"><Link href={routes.tool(code.toolSlug)}>{code.tool}</Link> <small>{code.discount}</small></span>
                  <span role="cell" className="k-cs-state"><CodeState code={code} /></span>
                  <span role="cell" className="k-cs-n">{formatCopies(n)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="k-cs-note">Les copies viennent du compteur anonyme de Merkod : un total par jour, rien sur les visiteurs. Bientôt : une alerte quand un code ne marche plus.</p>
        </section>
      </div>
    </main>
  );
}
