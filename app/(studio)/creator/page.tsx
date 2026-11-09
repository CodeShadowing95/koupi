import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDb } from '@/db';
import { isPublic, type Code } from '@/lib/data';
import { getCatalog, getFullCatalog } from '@/lib/catalog-server';
import { copiesByCode } from '@/lib/creator-auth';
import { currentCreatorAccount } from '@/lib/creator-current';
import { creatorLevelFromAccounts } from '@/lib/creator-level';
import { loadSelfProof } from '@/lib/creator-self-proof';
import { bestMatch, provisionalUsers } from '@/lib/creator-merge';
import { copiesPerDay, greeting, loadFindablePages, matchCreatorPages, rosetteGoal, studioAccounts, weekTrend } from '@/lib/creator-studio';
import { formatCopies } from '@/lib/creator-page';
import { MIN_RATINGS, MIN_SUBSCRIBERS } from '@/lib/verification';
import { routes } from '@/lib/routes';
import { siteUrl } from '@/lib/seo';
import { Counter } from '@/components/site/counter';
import { CodeBadge } from '@/components/site/code-badge';
import { TrustPill } from '@/components/site/trust';
import { CopyPageLink } from '@/components/site/creator-space-actions';
import { CreatorProof } from '@/components/site/creator-proof';
import { ClaimPageButton } from '@/components/site/claim-page-button';
import { StudioSkip, VerifyRequest } from '@/components/site/studio-skip';
import { StudioAddCode } from '@/components/site/studio-add-code';
import { studioExpiry } from '@/lib/code-expiry';
import { CopiesChart, RosetteRing, StudioShell, type StudioNavItem } from '@/components/site/studio';
import { StudioSeasonKit } from '@/components/site/studio-season-kit';
import { currentSeason } from '@/lib/season-banner';
import { KIT_LABEL, kitCodes, kitDescription, kitImagePath, kitKindForSeason, kitPath, kitYear } from '@/lib/season-kit';

export const metadata: Metadata = { title: 'Merkod Studio', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

// Mêmes mots et mêmes pastilles que sur le site public ; « En relecture » et « Retiré » n'existent qu'ici.
/** La date de fin, discrète sous l'offre : elle ne ressort qu'à l'approche de la fin. */
function CodeEnd({ expiresOn }: { expiresOn: string | null | undefined }) {
  const end = studioExpiry(expiresOn);
  if (!end) return null;
  return <span className={`k-st-end${end.warn ? ' is-warn' : ''}`} title={end.title}>
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    {end.text}</span>;
}

function CodeState({ code }: { code: Code }) {
  if (code.status === 'pending') return <TrustPill seal="to_test" label="En relecture" title="Merkod relit ce code avant de le publier." dark />;
  if (code.status === 'rejected') return <TrustPill seal="expired" label="Retiré" title="Ce code n’est plus affiché sur Merkod." dark />;
  return <CodeBadge code={code} dark withDate={false} withExpiry={false} />;
}

const siteHost = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
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
    const found = !pages.length && query ? matchCreatorPages(await loadFindablePages(db), query) : [];
    const nav: StudioNavItem[] = [
      pages.length ? { id: 'preuve', label: 'Prouver ma chaîne', icon: 'proof' } : { id: 'trouver', label: 'Trouver ma page', icon: 'search' },
      { id: 'passer', label: 'Passer cette étape', icon: 'page' },
    ];
    return (
      <StudioShell email={account.email} creator={null} nav={nav} title="Bienvenue dans ton studio">
        <section className="k-st-hello">
          <p className="k-st-eyebrow">{greeting(now)} · {today(now)}</p>
          <h2>{pages.length ? 'Une dernière étape, et ton studio s’allume.' : 'Ton studio t’attend. Relie ta page.'}</h2>
          <p>{pages.length
            ? 'Colle ton code dans la bio d’un de tes comptes : seul son vrai propriétaire peut le faire. Dès qu’il y est, tes copies s’affichent ici.'
            : 'Tu as déjà une chaîne avec du public ? Cherche ta page et prouve qu’elle est à toi : tes codes seront publiés sans attente. Sinon, passe cette étape et ouvre ton studio tout de suite.'}</p>
        </section>
        <ol className="k-st-steps" aria-label="Étapes">
          <li className="is-done"><b>Compte créé</b><span>Connecté avec {account.email}</span></li>
          <li className={pages.length ? 'is-done' : 'is-now'}><b>Page revendiquée</b><span>{pages.length ? pages.map(page => page.name).join(', ') : 'Facultatif : trouve ta page'}</span></li>
          <li className={pages.length ? 'is-now' : ''}><b>Preuve par ta bio</b><span>Facultatif : un petit code à coller</span></li>
          <li><b>Studio ouvert</b><span>Copies, codes, lien de ta page</span></li>
        </ol>
        {pages.length > 0 ? (
          <section id="preuve" className="k-st-section"><CreatorProof pages={pages} /></section>
        ) : (
          <section id="trouver" className="k-st-section k-st-card">
            <h2 className="k-st-h2">Trouver ma page</h2>
            <form className="k-st-find" action={routes.creatorSpace} method="get" role="search">
              <label className="k-sr" htmlFor="k-st-q">Nom de ta chaîne</label>
              <input id="k-st-q" name="q" type="search" defaultValue={query} placeholder="Ton nom, ta chaîne ou ton @pseudo" maxLength={80} required />
              <button type="submit" className="k-btn k-btn-primary">Chercher</button>
            </form>
            {query && (found.length ? (
              <ul className="k-st-found" aria-label="Pages trouvées">
                {found.map(page => (
                  <li key={page.slug}>
                    <span><b>{page.name}</b><small>{[...page.accounts.slice(0, 2).map(account => account.handle), page.codes ? `${page.codes} code${page.codes > 1 ? 's' : ''}` : 'Pas encore de code'].join(' · ')}</small></span>
                    <Link className="k-btn k-btn-primary" href={routes.forCreators(page.slug)}>C’est ma page</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="k-st-none" role="status">Aucune page « {query} » sur Merkod pour l’instant. Pas de souci : passe cette étape juste en dessous, ton studio s’ouvre sur une page à ton nom.</p>
            ))}
          </section>
        )}
        <section id="passer" className="k-st-section k-st-card">
          <h2 className="k-st-h2">Pas de chaîne, ou pas maintenant ?</h2>
          <p className="k-st-muted">Ouvre ton studio sur une page à ton nom. Elle reste « non vérifiée » : tes codes passent par la relecture de Merkod avant d’être publiés. Tu pourras prouver ta chaîne plus tard, à tout moment.</p>
          <StudioSkip suggested={pages.length ? '' : query.replace(/^@/, '')} />
        </section>
      </StudioShell>
    );
  }

  const creator = account.creator;
  const [{ codes, tools }, copies, series, accounts] = await Promise.all([getFullCatalog(), copiesByCode(db, creator.id, now), copiesPerDay(db, creator.id, now), studioAccounts(db, creator.id)]);
  const own = codes.filter(code => code.creatorSlug === creator.slug && (isPublic(code) || code.status === 'pending'));
  const rows = own.map(code => ({ code, copies: copies.get(code.id) ?? 0 })).sort((a, b) => b.copies - a.copies || a.code.tool.localeCompare(b.code.tool, 'fr'));
  const total = rows.reduce((sum, row) => sum + row.copies, 0);
  const live = own.filter(isPublic).length;
  const reviewing = own.filter(code => code.status === 'pending').length;
  const top = rows[0]?.copies ? rows[0] : null;
  const trend = weekTrend(series);
  const toolChoices = tools.map(tool => ({ slug: tool.slug, name: tool.name, site: siteHost(tool.website) })).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const goal = rosetteGoal(accounts);
  const level = creatorLevelFromAccounts(accounts);
  // Page non vérifiée : aucun compte prouvé par la bio (ADR-0043). On l'invite à faire vérifier sa chaîne.
  const proven = accounts.some(item => item.claimStatus === 'verified');
  const asked = account.claims.some(claim => claim.slug === creator.slug);
  const selfProof = proven ? [] : await loadSelfProof(db, account, now);
  const ownProof = asked ? selfProof.filter(page => page.slug === creator.slug && page.accounts.length > 0) : [];
  // Sa vraie page existe peut-être déjà sur Merkod (ADR-0044) : il la revendique, la prouve, et sa page provisoire y est fusionnée.
  const realProof = selfProof.filter(page => page.slug !== creator.slug && page.accounts.length > 0);
  const realAsked = account.claims.find(claim => claim.slug !== creator.slug) ?? null;
  const realMatch = proven || realAsked ? null
    : bestMatch(await loadFindablePages(db), creator, new Set((await provisionalUsers(db)).map(user => user.slug)));
  // Kit de saison (Black Friday, Noël) : seulement pendant la saison, et dès qu'un code est en ligne.
  const season = currentSeason(now);
  const kitKind = kitKindForSeason(season);
  // Le catalogue public, comme la page du kit : un code d'un univers masqué n'y apparaît pas.
  const kitPicks = kitKind ? kitCodes((await getCatalog()).codes.filter(code => code.creatorSlug === creator.slug), now) : [];
  const kit = kitKind && season && kitPicks.length ? {
    kind: kitKind,
    label: KIT_LABEL[kitKind],
    days: season.daysLeft,
    pagePath: kitPath(creator.slug, kitKind),
    imagePath: kitImagePath(creator.slug, kitKind),
    description: kitDescription({ kind: kitKind, year: kitYear(kitKind, now), url: new URL(kitPath(creator.slug, kitKind), siteUrl()).toString(), codes: kitPicks }),
    count: kitPicks.length,
  } : null;
  const nav: StudioNavItem[] = [
    { id: 'apercu', label: 'Tableau de bord', icon: 'home' },
    ...(kit ? [{ id: 'kit', label: `Kit ${kit.label}`, icon: 'gift' as const }] : []),
    { id: 'codes', label: 'Mes codes', icon: 'codes' },
    { id: 'page', label: 'Ma page', icon: 'page' },
    proven ? { id: 'rosette', label: 'Objectif rosette', icon: 'rosette' } : { id: 'verifier', label: 'Faire vérifier ma chaîne', icon: 'proof' },
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
          {!proven && <p><a className="k-st-unverified" href="#verifier">Page non vérifiée</a></p>}
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
                <small>{top.code.tool} · {nb(top.copies)} {top.code.code ? 'copie' : 'clic'}{top.copies > 1 ? 's' : ''}</small>
              </> : <><b className="k-st-star-code">—</b><small>Le premier code copié prendra la place</small></>}
            </div>
          </div>
        </div>
      </section>

      {kit && (
        <section id="kit" className={`k-st-section k-st-card k-st-kit-card is-${kit.kind}`}>
          <h2 className="k-st-h2">Ton kit {kit.label}</h2>
          <StudioSeasonKit label={kit.label} days={kit.days} pagePath={kit.pagePath} imagePath={kit.imagePath} description={kit.description} count={kit.count} />
        </section>
      )}

      <section id="codes" className="k-st-section">
        <div className="k-st-section-head">
          <h2 className="k-st-h2">Mes codes</h2>
          <p className="k-st-muted">Copies depuis le 1er {month} ; pour une offre sans code, les clics sur ton lien. Les chiffres viennent du compteur anonyme de Merkod : un total par jour, rien sur les visiteurs.</p>
        </div>
        <StudioAddCode tools={toolChoices} proven={proven} />
        {rows.length === 0 ? <p className="k-st-card k-st-muted">Aucun code pour l’instant. Ajoute le premier : ta page apparaîtra sur Merkod dès qu’il sera publié.</p> : (
          <ul className="k-st-codes">
            {rows.map(({ code, copies: n }) => (
              <li key={code.id} className="k-st-code-row">
                <span className="k-st-code">{code.code || 'Lien seul'}</span>
                <span className="k-st-tool"><Link href={routes.tool(code.toolSlug)} target="_blank">{code.tool}</Link><small>{code.discount}</small><CodeEnd expiresOn={code.expiresOn} /></span>
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
          <p className="k-st-muted">{live
            ? 'Mets ce lien dans tes descriptions : tous tes codes au même endroit, chacun avec la vidéo d’où il vient.'
            : 'Ta page apparaîtra sur Merkod dès que ton premier code sera publié. Garde ce lien sous la main.'}</p>
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

      {!proven && (
        <section id="verifier" className="k-st-section k-st-card k-st-verify">
          <h2 className="k-st-h2">Fais vérifier ta chaîne</h2>
          <p className="k-st-muted">Ta page est « non vérifiée » : tes codes passent par la relecture de Merkod avant d’être publiés. Prouve que ta chaîne est à toi, en deux minutes :</p>
          <ul className="k-st-perks">
            <li><b>Tes codes publiés sans attente</b><span>Plus de relecture : ils sont en ligne dès que tu les ajoutes.</span></li>
            <li><b>La coche bleue sur ta page</b><span>Tes abonnés savent que c’est bien toi.</span></li>
            <li><b>La rosette « Créateur vérifié »</b><span>Dès {nb(MIN_SUBSCRIBERS)} abonnés, ou {MIN_RATINGS} notes pour un podcast.</span></li>
          </ul>
          {realProof.length > 0 ? (
            <div id="relier" className="k-st-relink">
              <p className="k-st-muted">Prouve ta page <b>{realProof[0].name}</b> : dès que c’est fait, ta page provisoire et tes codes y passent, et tu gardes ce studio.</p>
              <CreatorProof pages={realProof} />
            </div>
          ) : realAsked ? (
            <p id="relier" className="k-st-none" role="status">Demande reçue pour la page {realAsked.name}. Merkod contrôle ses comptes, puis ton code de preuve apparaîtra ici. Une fois prouvée, ta page provisoire et tes codes y passeront.</p>
          ) : realMatch ? (
            <div id="relier" className="k-st-relink">
              <p className="k-st-muted">Merkod a déjà une page <b>{realMatch.name}</b>{realMatch.accounts[0] ? <> ({realMatch.accounts[0].handle})</> : null}. C’est toi ? Revendique-la : une fois prouvée par ta bio, ta page provisoire et tes codes y passent.</p>
              <ClaimPageButton slug={realMatch.slug} name={realMatch.name} next={`${routes.creatorSpace}#relier`} label="C’est moi, relier cette page" />
            </div>
          ) : null}
          {ownProof.length > 0 ? <CreatorProof pages={ownProof} />
            : realAsked || realProof.length > 0 ? null
            : asked ? <p className="k-st-none" role="status">Demande reçue. Merkod ajoute ta chaîne à ta page et la contrôle, puis ton code de preuve apparaîtra ici.</p>
            : <VerifyRequest slug={creator.slug} />}
        </section>
      )}
    </StudioShell>
  );
}
