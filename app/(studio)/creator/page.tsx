import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDb } from '@/db';
import { isPublic, type Code } from '@/lib/data';
import { getCatalog } from '@/lib/catalog-server';
import { copiesByCode } from '@/lib/creator-auth';
import { currentCreatorAccount } from '@/lib/creator-current';
import { creatorLevelFromAccounts } from '@/lib/creator-level';
import { loadSelfProof } from '@/lib/creator-self-proof';
import { copiesPerDay, findCreatorPages, greeting, rosetteGoal, studioAccounts, weekTrend } from '@/lib/creator-studio';
import { formatCopies } from '@/lib/creator-page';
import { MIN_RATINGS, MIN_SUBSCRIBERS } from '@/lib/verification';
import { routes } from '@/lib/routes';
import { siteUrl } from '@/lib/seo';
import { Counter } from '@/components/site/counter';
import { CodeBadge } from '@/components/site/code-badge';
import { TrustPill } from '@/components/site/trust';
import { CopyPageLink } from '@/components/site/creator-space-actions';
import { CreatorProof } from '@/components/site/creator-proof';
import { CopiesChart, RosetteRing, StudioShell, type StudioNavItem } from '@/components/site/studio';

export const metadata: Metadata = { title: 'Merkod Studio', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

// Mêmes mots et mêmes pastilles que sur le site public ; « En relecture » et « Retiré » n'existent qu'ici.
function CodeState({ code }: { code: Code }) {
  if (code.status === 'pending') return <TrustPill seal="to_test" label="En relecture" title="Merkod relit ce code avant de le publier." dark />;
  if (code.status === 'rejected') return <TrustPill seal="expired" label="Retiré" title="Ce code n’est plus affiché sur Merkod." dark />;
  return <CodeBadge code={code} dark withDate={false} />;
}

const nb = (n: number) => formatCopies(n).replace(/\s/g, ' ');
const today = (now: Date) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(now);

// Merkod Studio : l'espace du créateur connecté (ADR-0021). Ses chiffres, ses codes, sa page, son objectif.
export default async function CreatorStudio({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await currentCreatorAccount();
  if (!account) redirect(routes.forCreators());
  const now = new Date();
  const db = getDb();

  if (!account.creator) {
    const pages = account.claims.length ? await loadSelfProof(db, account, now) : [];
    const raw = (await searchParams).q;
    const query = (typeof raw === 'string' ? raw : '').trim().slice(0, 80);
    const found = !pages.length && query ? findCreatorPages((await getCatalog()).codes, query) : [];
    const nav: StudioNavItem[] = pages.length ? [{ id: 'preuve', label: 'Prouver ma chaîne', icon: 'proof' }] : [{ id: 'trouver', label: 'Trouver ma page', icon: 'search' }];
    return (
      <StudioShell email={account.email} creator={null} nav={nav} title="Bienvenue dans ton studio">
        <section className="k-st-hello">
          <p className="k-st-eyebrow">{greeting(now)} · {today(now)}</p>
          <h2>{pages.length ? 'Une dernière étape, et ton studio s’allume.' : 'Ton studio t’attend. Relie ta page.'}</h2>
          <p>{pages.length
            ? 'Colle ton code dans la bio d’un de tes comptes : seul son vrai propriétaire peut le faire. Dès qu’il y est, tes copies s’affichent ici.'
            : 'Ton compte est créé, mais il n’est relié à aucune page. Cherche la tienne, puis clique « C’est ta page ? ».'}</p>
        </section>
        <ol className="k-st-steps" aria-label="Étapes">
          <li className="is-done"><b>Compte créé</b><span>Connecté avec {account.email}</span></li>
          <li className={pages.length ? 'is-done' : 'is-now'}><b>Page revendiquée</b><span>{pages.length ? pages.map(page => page.name).join(', ') : 'Trouve ta page sur Merkod'}</span></li>
          <li className={pages.length ? 'is-now' : ''}><b>Preuve par ta bio</b><span>Un petit code à coller</span></li>
          <li><b>Studio ouvert</b><span>Copies, codes, lien de ta page</span></li>
        </ol>
        {pages.length > 0 ? (
          <section id="preuve" className="k-st-section"><CreatorProof pages={pages} /></section>
        ) : (
          <section id="trouver" className="k-st-section k-st-card">
            <h2 className="k-st-h2">Trouver ma page</h2>
            <form className="k-st-find" action={routes.creatorSpace} method="get" role="search">
              <label className="k-sr" htmlFor="k-st-q">Nom de ta chaîne</label>
              <input id="k-st-q" name="q" type="search" defaultValue={query} placeholder="Le nom de ta chaîne ou de ton podcast" maxLength={80} required />
              <button type="submit" className="k-btn k-btn-primary">Chercher</button>
            </form>
            {query && (found.length ? (
              <ul className="k-st-found" aria-label="Pages trouvées">
                {found.map(page => (
                  <li key={page.slug}>
                    <span><b>{page.name}</b><small>{page.codes} code{page.codes > 1 ? 's' : ''} sur Merkod</small></span>
                    <Link className="k-btn k-btn-primary" href={routes.forCreators(page.slug)}>C’est ma page</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="k-st-none" role="status">Aucune page « {query} » sur Merkod pour l’instant. Une page naît avec un premier code : propose-en un, et elle se crée dès qu’il est validé.</p>
            ))}
            <p className="k-st-muted">Tu n’y es pas encore ? <Link href={routes.submit()}>Propose un de tes codes</Link> : ta page se crée avec lui.</p>
          </section>
        )}
      </StudioShell>
    );
  }

  const creator = account.creator;
  const [{ codes }, copies, series, accounts] = await Promise.all([getCatalog(), copiesByCode(db, creator.id, now), copiesPerDay(db, creator.id, now), studioAccounts(db, creator.id)]);
  const own = codes.filter(code => code.creatorSlug === creator.slug && (isPublic(code) || code.status === 'pending'));
  const rows = own.map(code => ({ code, copies: copies.get(code.id) ?? 0 })).sort((a, b) => b.copies - a.copies || a.code.tool.localeCompare(b.code.tool, 'fr'));
  const total = rows.reduce((sum, row) => sum + row.copies, 0);
  const live = own.filter(isPublic).length;
  const reviewing = own.filter(code => code.status === 'pending').length;
  const top = rows[0]?.copies ? rows[0] : null;
  const trend = weekTrend(series);
  const goal = rosetteGoal(accounts);
  const level = creatorLevelFromAccounts(accounts);
  const nav: StudioNavItem[] = [
    { id: 'apercu', label: 'Tableau de bord', icon: 'home' },
    { id: 'codes', label: 'Mes codes', icon: 'codes' },
    { id: 'page', label: 'Ma page', icon: 'page' },
    { id: 'rosette', label: 'Objectif rosette', icon: 'rosette' },
  ];
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'Europe/Paris' }).format(now);
  const pageUrl = routes.creator(creator.slug);

  return (
    <StudioShell
      email={account.email}
      creator={{ name: creator.name, slug: creator.slug, level }}
      nav={nav}
      title="Tableau de bord"
      actions={<CopyPageLink path={pageUrl} />}
    >
      <section id="apercu" className="k-st-section">
        <div className="k-st-hello">
          <p className="k-st-eyebrow">{greeting(now)} · {today(now)}</p>
          <h2>{greeting(now)}, {creator.name}.</h2>
        </div>

        <div className="k-st-hero">
          <div className="k-st-card k-st-main-kpi">
            <span className="k-st-label">Copies de tes codes en {month}</span>
            <p className="k-st-big"><Counter value={total} group /></p>
            <p className="k-st-trend">
              {trend.change === null
                ? (trend.last > 0 ? <><b>{nb(trend.last)}</b> ces 7 derniers jours</> : 'Pas encore de copie ces 7 derniers jours')
                : <><span className={`k-st-chip ${trend.change >= 0 ? 'is-up' : 'is-down'}`}>{trend.change >= 0 ? '▲' : '▼'} {Math.abs(trend.change)} %</span> par rapport à la semaine d’avant</>}
            </p>
            <CopiesChart series={series} />
          </div>

          <div className="k-st-kpis">
            <div className="k-st-ticket">
              <span className="k-st-label">Codes en ligne</span>
              <b>{live}</b>
              <small>{reviewing ? `${reviewing} en relecture` : 'Tous publiés'}</small>
            </div>
            <div className="k-st-ticket is-paper">
              <span className="k-st-label">Ton code star</span>
              {top ? <>
                <b className="k-st-star-code">{top.code.code || 'Lien seul'}</b>
                <small>{top.code.tool} · {nb(top.copies)} copie{top.copies > 1 ? 's' : ''}</small>
              </> : <><b className="k-st-star-code">—</b><small>Le premier code copié prendra la place</small></>}
            </div>
          </div>
        </div>
      </section>

      <section id="codes" className="k-st-section">
        <div className="k-st-section-head">
          <h2 className="k-st-h2">Mes codes</h2>
          <p className="k-st-muted">Copies depuis le 1er {month}. Les chiffres viennent du compteur anonyme de Merkod : un total par jour, rien sur les visiteurs.</p>
        </div>
        {rows.length === 0 ? <p className="k-st-card k-st-muted">Aucun code pour l’instant.</p> : (
          <ul className="k-st-codes">
            {rows.map(({ code, copies: n }) => (
              <li key={code.id} className="k-st-code-row">
                <span className="k-st-code">{code.code || 'Lien seul'}</span>
                <span className="k-st-tool"><Link href={routes.tool(code.toolSlug)} target="_blank">{code.tool}</Link><small>{code.discount}</small></span>
                <span className="k-st-state"><CodeState code={code} /></span>
                <span className="k-st-share" aria-hidden="true"><i style={{ width: `${total ? Math.max(2, Math.round((n / total) * 100)) : 0}%` }} /></span>
                <span className="k-st-n">{nb(n)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="k-st-duo">
        <section id="page" className="k-st-section k-st-card">
          <h2 className="k-st-h2">Ma page</h2>
          <p className="k-st-muted">Mets ce lien dans tes descriptions : tous tes codes au même endroit, chacun avec la vidéo d’où il vient.</p>
          <p className="k-st-url"><span>{new URL(siteUrl()).host}</span>{pageUrl}</p>
          <div className="k-st-row">
            <CopyPageLink path={pageUrl} />
            <Link className="k-btn k-btn-ghost" href={pageUrl} target="_blank">Ouvrir ma page ↗</Link>
          </div>
        </section>

        <section id="rosette" className="k-st-section k-st-card k-st-goal">
          <RosetteRing percent={goal.percent} reached={goal.reached} />
          <div>
            <h2 className="k-st-h2">{goal.reached ? 'Tu es « Créateur vérifié »' : 'Objectif rosette'}</h2>
            {goal.reached ? <p className="k-st-muted">La rosette bleue s’affiche à côté de ton nom, sur ta page et sur chacun de tes codes.</p>
              : goal.best ? <p className="k-st-muted">Encore <b>{nb(goal.remaining)} {goal.best.unit}</b> sur {goal.best.label} ({goal.best.handle}) pour la rosette « Créateur vérifié ».{goal.best.proven ? '' : ' Ce compte doit aussi être prouvé par ta bio.'}</p>
              : <p className="k-st-muted">La rosette demande un compte prouvé avec au moins {nb(MIN_SUBSCRIBERS)} abonnés, ou {MIN_RATINGS} notes pour un podcast.</p>}
          </div>
        </section>
      </div>
    </StudioShell>
  );
}
