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
import { Crumbs } from '@/components/site/page-head';
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
  const { codes, tools } = await getCatalog();
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
  return (
    <main className="k-page">
      <div className="k-wrap">
        <Crumbs items={[{ label: 'Créateurs', href: routes.creators() }, { label: creator }]} />
        <JsonLd data={creatorProfileLd({ name: creator, path: routes.creator(match.creatorSlug), bio: profile?.bio, accounts: (profile?.accounts ?? []).map(account => account.url), image: media.avatars[creator] }, siteUrl())} />
        {/* L'essentiel d'abord : qui, combien de codes, où le suivre. Le reste se déplie avec « Plus d'infos ». */}
        <header className="k-creator-head">
          <CreatorAvatar name={creator} size="lg" />
          <div className="k-creator-main">
            <h1 className="k-creator-name" title={creator}>{creator}</h1>
            <div className="k-creator-line">
              {match.creatorLevel && <CreatorMark level={match.creatorLevel} dark />}
              <span className="k-creator-stats">
                <span><b>{creatorCodes.length}</b> {creatorCodes.length > 1 ? 'codes' : 'code'}</span>
                {copies > 0 && <span><b>{formatCopies(copies)}</b> {copies > 1 ? 'copies' : 'copie'} ce mois-ci</span>}
              </span>
              {profile && profile.accounts.length > 0 && (
                <ul className="k-creator-networks" aria-label={`Comptes de ${creator}`}>
                  {profile.accounts.map(account => (
                    <li key={`${account.platform}-${account.handle}`}>
                      <a href={account.url} target="_blank" rel="noopener noreferrer me" className={account.proven ? 'is-proven' : undefined}
                        title={`${account.label} · ${account.handle}${account.proven ? ' · compte prouvé par le créateur' : ''}`} aria-label={`${account.label} · ${account.handle}${account.proven ? ', compte prouvé par le créateur' : ''}`}>
                        <PlatformIcon platform={account.platform} size={30} className="k-platform-icon" />
                        {account.proven && <span className="k-chip-proof is-badge" aria-hidden="true">✓</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <CopyPageLink className="k-btn k-btn-ghost k-creator-share" label="Copier le lien de sa page" />
          <div className="k-creator-more-wrap">
            <CreatorMore>
              {profile?.bio && <p className="k-creator-bio">{profile.bio}</p>}
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
        <CreatorCodes codes={active} expired={expired} tools={tools} creator={creator}
          expiredTitle={plural(expired.length, 'code à la date de fin passée', 'codes à la date de fin passée')} />
      </div>
      <VoteInvite trigger="copy" />
    </main>
  );
}
