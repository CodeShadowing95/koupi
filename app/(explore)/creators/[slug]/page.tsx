import type { Metadata } from 'next';
import Link from '@/components/site/site-pages';
import { notFound, permanentRedirect } from 'next/navigation';
import { isPublic, type Code } from '@/lib/data';
import { getCatalog, getCreatorFacts, getCreatorProfile, getMediaMap } from '@/lib/catalog-server';
import { creatorCategories } from '@/lib/creator-profile';
import { creatorDescription, formatCopies } from '@/lib/creator-page';
import { expiryOf } from '@/lib/code-expiry';
import { routes } from '@/lib/routes';
import { creatorSlug, plural } from '@/lib/ui';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { CreatorMark } from '@/components/site/creator-mark';
import { CreatorRequest } from '@/components/site/creator-request';
import { CreatorMore } from '@/components/site/creator-more';
import { CreatorCodes } from '@/components/site/creator-codes';
import { PlatformIcon } from '@/components/platform-icon';
import { ExploreShell } from '@/components/site/explore-shell';
import { totalVotes } from '@/lib/explore';
import { JsonLd } from '@/components/json-ld';
import { creatorProfileLd } from '@/lib/structured-data';
import { seoMonth, siteUrl } from '@/lib/seo';
import { CopyPageLink } from '@/components/site/copy-page-link';
import { VoteInvite } from '@/components/site/vote-invite';

function publicCodesOf(codes: Code[], slug: string) {
  return codes.filter(code => code.creatorSlug === slug && isPublic(code));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { codes } = await getCatalog();
  const own = publicCodesOf(codes, slug);
  if (!own.length) return {};
  const profile = await getCreatorProfile(slug);
  const title = `Codes promo de ${own[0].creator} ${seoMonth()} · Merkod`;
  const description = creatorDescription(own[0].creator, own, profile?.bio ?? null);
  return { title, description, alternates: { canonical: routes.creator(slug) }, openGraph: { title, description, type: 'profile' } };
}

export default async function Creator({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { codes, tools, families } = await getCatalog();
  const match = codes.find(code => code.creatorSlug === slug);
  if (!match) {
    // Anciennes adresses (avant le passage en base, le slug gardait accents et tirets en trop).
    const legacy = codes.find(code => creatorSlug(code.creator) === slug);
    if (legacy) permanentRedirect(routes.creator(legacy.creatorSlug));
    notFound();
  }
  const creator = match.creator;
  const creatorCodes = publicCodesOf(codes, match.creatorSlug);
  // Une date de fin passée : on garde le code pour l'historique, mais replié en bas.
  const expired = creatorCodes.filter(code => expiryOf(code.expiresOn).state === 'expired');
  const active = creatorCodes.filter(code => !expired.includes(code));
  const [profile, facts, media] = await Promise.all([getCreatorProfile(match.creatorSlug), getCreatorFacts(), getMediaMap()]);
  const copies = facts[match.creatorSlug]?.copies ?? 0;
  const themes = creatorCategories(creatorCodes, tools);
  const toolCount = new Set(creatorCodes.map(code => code.toolSlug)).size;
  const verified = creatorCodes.filter(code => code.status === 'verified').length;
  const votes = totalVotes(creatorCodes);
  const accounts = profile?.accounts ?? [];
  return (
    <ExploreShell codes={codes.filter(isPublic)} tools={tools} families={families} now={Date.now()} active={{ kind: 'creator', slug: match.creatorSlug }} skipLabel="Aller à ses codes">
      <main className="k-ex-feed k-ex-page" id="contenu">
        <JsonLd data={creatorProfileLd({ name: creator, path: routes.creator(match.creatorSlug), bio: profile?.bio, accounts: accounts.map(account => account.url), image: media.avatars[creator] }, siteUrl())} />
        {/* En-tête façon chaîne : bandeau papier, photo, nom, l'essentiel en une ligne, ses comptes. Le reste se déplie. */}
        <header className="k-chan">
          <div className="k-chan-banner k-paper" aria-hidden="true" />
          <div className="k-chan-id">
            <CreatorAvatar name={creator} size="lg" className="k-chan-av" />
            <div className="k-chan-main">
              <h1 className="k-chan-name" title={creator}>{creator}</h1>
              <p className="k-chan-meta">
                {match.creatorLevel && <CreatorMark level={match.creatorLevel} dark />}
                <span>{plural(creatorCodes.length, 'code', 'codes')}</span>
                <span>{plural(toolCount, 'outil', 'outils')}</span>
                {copies > 0 && <span>{formatCopies(copies)} {copies > 1 ? 'copies' : 'copie'} ce mois-ci</span>}
              </p>
              {profile?.bio && <p className="k-chan-bio">{profile.bio}</p>}
              {accounts.length > 0 && (
                <ul className="k-creator-networks" aria-label={`Comptes de ${creator}`}>
                  {accounts.map(account => (
                    <li key={`${account.platform}-${account.handle}`}>
                      <a href={account.url} target="_blank" rel="noopener noreferrer me" className={account.proven ? 'is-proven' : undefined}
                        title={`${account.label} · ${account.handle}${account.proven ? ' · compte prouvé par le créateur' : ''}`} aria-label={`${account.label} · ${account.handle}${account.proven ? ', compte prouvé par le créateur' : ''}`}>
                        <PlatformIcon platform={account.platform} size={28} className="k-platform-icon" />
                        {account.proven && <span className="k-chip-proof is-badge" aria-hidden="true">✓</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="k-chan-actions">
              <CopyPageLink className="k-btn k-btn-ghost k-btn-sm" label="Copier le lien de sa page" />
            </div>
          </div>
          <div className="k-chan-more">
            <CreatorMore>
              <p className="k-creator-about">{plural(creatorCodes.length, 'code partagé', 'codes partagés')}, chacun avec la vidéo ou le post d&apos;où il vient.</p>
              {themes.length > 0 && <ul className="k-creator-themes" aria-label="Thèmes">{themes.map(theme => <li key={theme} className="k-pill">{theme}</li>)}</ul>}
              {profile && profile.accounts.length > 0 && (
                <ul className="k-creator-accounts" aria-label={`Comptes de ${creator} en détail`}>
                  {profile.accounts.map(account => (
                    <li key={`${account.platform}-${account.handle}`}>
                      <a className="k-chip" href={account.url} target="_blank" rel="noopener noreferrer me" title={account.proven ? 'Compte prouvé par le créateur' : undefined}>
                        {account.proven && <span className="k-chip-proof" aria-label="Compte prouvé par le créateur">✓</span>}
                        <PlatformIcon platform={account.platform} size={20} className="k-platform-icon" />
                        {account.label} · {account.handle}{account.audience && <small>{account.audience}</small>}<span aria-hidden="true">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {match.creatorLevel !== 'verified' && <p className="k-creator-managed">
                <b>Page tenue par Merkod.</b> Ses codes viennent de ses vidéos et posts publics, chacun avec sa source. <Link href={routes.transparency}>Comment on vérifie</Link>
              </p>}
              {match.creatorLevel !== 'verified' && <CreatorRequest slug={match.creatorSlug} name={creator} />}
            </CreatorMore>
          </div>
        </header>

        {/* Les chiffres qui comptent pour décider : combien de codes, combien vérifiés par Merkod, les votes « ça marche ». */}
        <dl className="k-chan-stats">
          <div><dt>Codes actifs</dt><dd>{active.length}</dd></div>
          <div><dt>Vérifiés par Merkod</dt><dd>{verified}</dd></div>
          <div><dt>Votes « ça marche »</dt><dd>{votes}</dd></div>
          <div><dt>Copies ce mois-ci</dt><dd>{formatCopies(copies)}</dd></div>
        </dl>

        <CreatorCodes codes={active} expired={expired} tools={tools} creator={creator}
          expiredTitle={plural(expired.length, 'code à la date de fin passée', 'codes à la date de fin passée')} />
      </main>
      <VoteInvite trigger="copy" />
    </ExploreShell>
  );
}
