import type { Metadata } from 'next';
import Link from 'next/link';
import { getCatalog, getCreatorFacts } from '@/lib/catalog-server';
import { buildDirectory, directoryOptions, filterDirectory } from '@/lib/creator-directory';
import { PLATFORM_LABELS, type CreatorPlatform } from '@/lib/creator-accounts-display';
import { formatCopies } from '@/lib/creator-page';
import { routes } from '@/lib/routes';
import { plural } from '@/lib/ui';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { CreatorMark } from '@/components/site/creator-mark';

export const metadata: Metadata = {
  title: 'Les créateurs · Koupi',
  description: 'Les créateurs YouTube, TikTok, Instagram et podcasts qui donnent des codes promo pour des outils en ligne, avec la source de chaque code.',
  alternates: { canonical: routes.creators() },
};

type Search = { platform?: string; theme?: string };
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || undefined;

export default async function Creators({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const [catalog, facts] = await Promise.all([getCatalog(), getCreatorFacts()]);
  const all = buildDirectory(catalog, facts);
  const options = directoryOptions(all);
  // On ne garde que des filtres qui existent : une adresse bricolée affiche simplement tout.
  const filter: Search = {
    platform: options.platforms.includes(one(params.platform) as CreatorPlatform) ? one(params.platform) : undefined,
    theme: options.themes.includes(one(params.theme) ?? '') ? one(params.theme) : undefined,
  };
  const shown = filterDirectory(all, filter);

  return (
    <main className="k-page">
      <div className="k-wrap">
        <div className="k-page-head">
          <span className="k-eyebrow">Créateurs</span>
          <h1>Les créateurs</h1>
          <p>{plural(all.length, 'créateur donne', 'créateurs donnent')} des codes promo pour des outils en ligne. Chaque code renvoie à la vidéo ou au post d&apos;où il vient.</p>
        </div>

        {(options.platforms.length > 1 || options.themes.length > 1) && (
          <nav className="k-dir-filters" aria-label="Filtrer les créateurs">
            {options.platforms.length > 1 && (
              <div>
                <span>Réseau</span>
                <Link className="k-chip" href={routes.creators({ theme: filter.theme })} aria-current={!filter.platform}>Tous</Link>
                {options.platforms.map(platform => (
                  <Link key={platform} className="k-chip" href={routes.creators({ platform, theme: filter.theme })} aria-current={filter.platform === platform}>{PLATFORM_LABELS[platform]}</Link>
                ))}
              </div>
            )}
            {options.themes.length > 1 && (
              <div>
                <span>Thème</span>
                <Link className="k-chip" href={routes.creators({ platform: filter.platform })} aria-current={!filter.theme}>Tous</Link>
                {options.themes.map(theme => (
                  <Link key={theme} className="k-chip" href={routes.creators({ platform: filter.platform, theme })} aria-current={filter.theme === theme}>{theme}</Link>
                ))}
              </div>
            )}
          </nav>
        )}

        {shown.length === 0 ? (
          <div className="k-empty">
            <h2>Aucun créateur pour ce choix.</h2>
            <p>Essaie un autre réseau ou un autre thème.</p>
            <Link className="k-btn k-btn-ghost" href={routes.creators()}>Voir tous les créateurs</Link>
          </div>
        ) : (
          <ul className="k-dir-grid">
            {shown.map(entry => (
              <li key={entry.slug}>
                <Link className="k-dir-card" href={routes.creator(entry.slug)}>
                  <div className="k-dir-who">
                    <CreatorAvatar name={entry.name} />
                    <div>
                      <h2>{entry.name} <CreatorMark level={entry.level} compact /></h2>
                      <small>{entry.platforms.length ? entry.platforms.map(platform => PLATFORM_LABELS[platform]).join(' · ') : entry.tools.slice(0, 3).join(', ')}</small>
                    </div>
                  </div>
                  {entry.bio && <p className="k-dir-bio">{entry.bio}</p>}
                  {entry.themes.length > 0 && <div className="k-dir-tags">{entry.themes.slice(0, 3).map(theme => <span key={theme} className="k-pill">{theme}</span>)}</div>}
                  <div className="k-dir-foot">
                    <span><b>{entry.codes}</b> {entry.codes > 1 ? 'codes' : 'code'}</span>
                    {entry.copies > 0 && <span><b>{formatCopies(entry.copies)}</b> {entry.copies > 1 ? 'copies' : 'copie'} ce mois-ci</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
