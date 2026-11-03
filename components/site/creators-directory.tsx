'use client';
import Link from '@/components/site/site-pages';
import { useEffect, useMemo, useState } from 'react';
import { directoryCounts, directoryParams, filterDirectory, type DirectoryEntry, type DirectoryFilter, type DirectorySort } from '@/lib/creator-directory-filter';
import { PLATFORM_LABELS, type CreatorPlatform } from '@/lib/creator-accounts-display';
import { formatCopies } from '@/lib/creator-page';
import { routes } from '@/lib/routes';
import { plural } from '@/lib/ui';
import { CreatorAvatar } from './creator-avatar';
import { CreatorMark } from './creator-mark';

// Annuaire des créateurs : recherche (nom ou outil), réseau, thème et tri, avec le nombre de créateurs derrière
// chaque choix. Les créateurs s'affichent par 12 (« Voir plus de créateurs »). Les filtres suivent l'adresse.

const PAGE = 12;
const SORTS: { value: DirectorySort; label: string }[] = [
  { value: 'copies', label: 'Les plus copiés ce mois-ci' },
  { value: 'codes', label: 'Le plus de codes' },
  { value: 'name', label: 'Par nom (A à Z)' },
];
/** Sur grand écran, au-delà, les thèmes les moins fréquents se rangent derrière « + N thèmes » ; sur mobile, la ligne défile. */
const THEMES_SHOWN = 6;

type Filter = Required<DirectoryFilter>;
const EMPTY: Filter = { platform: '', theme: '', query: '', sort: 'copies' };

type Props = { entries: DirectoryEntry[]; options: { platforms: CreatorPlatform[]; themes: string[] }; initial: Filter };

export function CreatorsDirectory({ entries, options, initial }: Props) {
  const [filter, setFilter] = useState<Filter>(initial);
  const [limit, setLimit] = useState(PAGE);
  const [allThemes, setAllThemes] = useState(() => options.themes.indexOf(initial.theme) >= THEMES_SHOWN);
  const shown = useMemo(() => filterDirectory(entries, filter), [entries, filter]);
  const counts = useMemo(() => directoryCounts(entries, filter), [entries, filter]);
  const update = (patch: Partial<Filter>) => { setFilter(current => ({ ...current, ...patch })); setLimit(PAGE); };

  useEffect(() => {
    const query = directoryParams(filter).toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
    if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, '', url);
  }, [filter]);

  const filtered = directoryParams(filter).toString() !== '';

  return (
    <>
      <div className="k-dir-bar" role="search" aria-label="Affiner les créateurs">
        <div className="k-dir-row">
          <label className="k-board-search k-dir-search">
            <span className="k-sr">Chercher un créateur ou un outil</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" value={filter.query} onChange={event => update({ query: event.target.value })} placeholder="Nom du créateur ou outil…" maxLength={80} />
          </label>
          <label className="k-dir-sort">
            <span className="k-sr">Trier par</span>
            <select className="k-board-select" value={filter.sort} onChange={event => update({ sort: event.target.value as DirectorySort })}>
              {SORTS.map(sort => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
            </select>
          </label>
        </div>
        {options.platforms.length > 1 && (
          <div className="k-dir-chips" role="group" aria-label="Réseau">
            <span>Réseau</span>
            <button type="button" className="k-chip" aria-pressed={!filter.platform} onClick={() => update({ platform: '' })}>Tous <small>{counts.all.platform}</small></button>
            {options.platforms.map(platform => (
              <button type="button" key={platform} className="k-chip" aria-pressed={filter.platform === platform}
                onClick={() => update({ platform: filter.platform === platform ? '' : platform })}>
                {PLATFORM_LABELS[platform]} <small>{counts.platform[platform] ?? 0}</small>
              </button>
            ))}
          </div>
        )}
        {options.themes.length > 1 && (
          <div className="k-dir-chips" role="group" aria-label="Thème">
            <span>Thème</span>
            <button type="button" className="k-chip" aria-pressed={!filter.theme} onClick={() => update({ theme: '' })}>Tous <small>{counts.all.theme}</small></button>
            {options.themes.map((theme, index) => (
              <button type="button" key={theme} className={`k-chip${index >= THEMES_SHOWN && !allThemes ? ' is-extra' : ''}`} aria-pressed={filter.theme === theme}
                onClick={() => update({ theme: filter.theme === theme ? '' : theme })}>
                {theme} <small>{counts.theme[theme] ?? 0}</small>
              </button>
            ))}
            {options.themes.length > THEMES_SHOWN && (
              <button type="button" className="k-dir-more-themes" aria-expanded={allThemes} onClick={() => setAllThemes(value => !value)}>
                {allThemes ? 'Moins de thèmes' : `+ ${options.themes.length - THEMES_SHOWN} thèmes`}
              </button>
            )}
          </div>
        )}
        <p className="k-dir-count" aria-live="polite">
          {plural(shown.length, 'créateur', 'créateurs')}
          {filtered && <button type="button" className="k-dir-reset" onClick={() => update(EMPTY)}>Tout afficher</button>}
        </p>
      </div>

      {shown.length === 0 ? (
        <div className="k-empty">
          <h2>Aucun créateur pour ce choix.</h2>
          <p>Essaie un autre nom, un autre réseau ou un autre thème.</p>
          <button type="button" className="k-btn k-btn-ghost" onClick={() => update(EMPTY)}>Voir tous les créateurs</button>
        </div>
      ) : (
        <>
          <ul className="k-dir-grid">
            {shown.slice(0, limit).map(entry => (
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
          {shown.length > limit && (
            <div className="k-dir-more">
              <button type="button" className="k-btn k-btn-ghost" onClick={() => setLimit(current => current + PAGE)}>
                Voir plus de créateurs <small>({shown.length - limit})</small>
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
