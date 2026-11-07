'use client';
import Link from '@/components/site/site-pages';
import { useEffect, useMemo, useState } from 'react';
import {
  directoryCounts, directoryParams, directoryPodium, filterDirectory, offerScore,
  type DirectoryEntry, type DirectoryFilter, type DirectorySort, type DirectoryTop,
} from '@/lib/creator-directory-filter';
import { PLATFORM_LABELS, type CreatorPlatform } from '@/lib/creator-accounts-display';
import type { Family } from '@/lib/data';
import { formatCopies } from '@/lib/creator-page';
import { copyText, openCreatorLink } from '@/lib/copy';
import { playCouponSnip } from '@/lib/coupon-sound';
import { routes } from '@/lib/routes';
import { track } from '@/lib/track';
import { plural } from '@/lib/ui';
import { CODE_COPIED_EVENT, type CopiedCode } from '@/lib/vote-invite';
import { PlatformIcon } from '@/components/platform-icon';
import { ChipRow } from './chip-row';
import { CreatorAvatar } from './creator-avatar';
import { CreatorMark } from './creator-mark';
import { ToolLogo } from './tool-logo';

// Annuaire des créateurs : recherche (nom ou outil), familles de catégories en pastilles (comme la page Codes),
// réseau et tri en menus. En haut, le podium des 3 créateurs les plus copiés ce mois-ci, puis la grille.
// Chaque carte montre ses outils, sa meilleure offre et son meilleur code, à copier sans quitter la page.
// Sur mobile, une ligne compacte par créateur. Les filtres suivent l'adresse.

const PAGE = 12;
const LOGOS_SHOWN = 4;
const SORTS: { value: DirectorySort; label: string }[] = [
  { value: 'copies', label: 'Les plus copiés ce mois-ci' },
  { value: 'codes', label: 'Le plus de codes' },
  { value: 'name', label: 'Par nom (A à Z)' },
];

type Filter = Required<DirectoryFilter>;
const EMPTY: Filter = { platform: '', family: '', query: '', sort: 'copies' };

type Props = { entries: DirectoryEntry[]; options: { platforms: CreatorPlatform[]; families: string[] }; families: Family[]; initial: Filter };

/** « jusqu'à 88 % + 4 mois offerts » quand il a plusieurs codes, l'offre telle quelle sinon. */
function offerLine(entry: DirectoryEntry) {
  const offer = entry.top.discount;
  return entry.codes > 1 && offerScore(offer) > 0 ? `jusqu’à ${offer.replace(/^-\s*/, '')}` : offer;
}

/** Le meilleur code du créateur, à copier d'un clic : même geste que le talon du coupon (copie, puis ouvre son lien). */
function QuickCopy({ top }: { top: DirectoryTop }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const copy = async () => {
    track('copy', top.id);
    playCouponSnip();
    const ok = await copyText(top.code);
    setFailed(!ok);
    if (copied) return;
    setCopied(true);
    window.dispatchEvent(new CustomEvent<CopiedCode>(CODE_COPIED_EVENT, { detail: { id: top.id, code: top.code, tool: top.tool, creator: top.creator } }));
    window.setTimeout(() => { if (top.link !== '#') track('open', top.id); openCreatorLink(top.link); }, 850);
  };
  // Offre sans code (ADR-0040) : rien à copier, le bouton ouvre le lien d'affiliation du créateur.
  if (!top.code) return (
    <a className="k-dir-copy is-link" href={top.link} target="_blank" rel="sponsored noopener noreferrer" onClick={() => track('open', top.id)}
      aria-label={`Profiter de l’offre ${top.tool} avec le lien de ${top.creator} (lien d’affiliation)`}>
      <code>Lien</code>
      <span className="k-dir-copy-stub">Profiter</span>
    </a>
  );
  return (
    <button type="button" className={`k-dir-copy${copied ? ' is-copied' : ''}`} onClick={copy}
      aria-label={copied ? `Recopier le code ${top.code}` : `Copier le code ${top.code} et ouvrir ${top.tool}`}>
      <code>{top.code}</code>
      <span className="k-dir-copy-stub" aria-live="polite">{failed ? 'À recopier' : copied ? 'Copié' : 'Copier'}</span>
    </button>
  );
}

function CreatorCard({ entry, rank }: { entry: DirectoryEntry; rank?: number }) {
  const extra = entry.logos.length - LOGOS_SHOWN;
  return (
    <article className={`k-dir-card${rank ? ' is-podium' : ''}`}>
      {rank && <span className="k-dir-rank" aria-label={`${rank}${rank === 1 ? 'er' : 'e'} ce mois-ci`}>{rank}</span>}
      <div className="k-dir-who">
        <CreatorAvatar name={entry.name} size={rank ? 'lg' : 'md'} />
        <div className="k-dir-id">
          <h3><Link className="k-dir-link" href={routes.creator(entry.slug)}>{entry.name}</Link> <CreatorMark level={entry.level} compact /></h3>
          {entry.platforms.length > 0 && (
            <span className="k-dir-nets">
              {entry.platforms.map(platform => <PlatformIcon key={platform} platform={platform} size={18} className="k-platform-icon" />)}
              <span className="k-sr">{entry.platforms.map(platform => PLATFORM_LABELS[platform]).join(', ')}</span>
            </span>
          )}
        </div>
      </div>
      <ul className="k-dir-logos" aria-label="Ses outils">
        {entry.logos.slice(0, LOGOS_SHOWN).map(tool => <li key={tool.slug} title={tool.name}><ToolLogo tool={tool.slug} name={tool.name} /><span className="k-sr">{tool.name}</span></li>)}
        {extra > 0 && <li className="k-dir-logos-more">+{extra}</li>}
      </ul>
      <p className="k-dir-offer"><b>{offerLine(entry)}</b> <small>chez {entry.top.tool}</small></p>
      <QuickCopy top={entry.top} />
      <div className="k-dir-foot">
        <span><b>{entry.codes}</b> {entry.codes > 1 ? 'codes' : 'code'}</span>
        {entry.copies > 0 && <span><b>{formatCopies(entry.copies)}</b> {entry.copies > 1 ? 'copies' : 'copie'} ce mois-ci</span>}
      </div>
    </article>
  );
}

export function CreatorsDirectory({ entries, options, families, initial }: Props) {
  const [filter, setFilter] = useState<Filter>(initial);
  const [limit, setLimit] = useState(PAGE);
  const shown = useMemo(() => filterDirectory(entries, filter), [entries, filter]);
  const counts = useMemo(() => directoryCounts(entries, filter), [entries, filter]);
  const update = (patch: Partial<Filter>) => { setFilter(current => ({ ...current, ...patch })); setLimit(PAGE); };

  useEffect(() => {
    const query = directoryParams(filter).toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
    if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, '', url);
  }, [filter]);

  const filtered = directoryParams(filter).toString() !== '';
  // Le podium n'apparaît que sur l'annuaire complet ; ses créateurs ne se répètent pas dans la grille.
  const podium = useMemo(() => (filtered ? [] : directoryPodium(entries)), [entries, filtered]);
  const grid = podium.length ? shown.filter(entry => !podium.includes(entry)) : shown;
  const familyChips = families.filter(family => options.families.includes(family.slug));

  return (
    <>
      <div className="k-dir-bar" role="search" aria-label="Affiner les créateurs">
        <div className="k-dir-row">
          <label className="k-board-search k-dir-search">
            <span className="k-sr">Chercher un créateur ou un outil</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" value={filter.query} onChange={event => update({ query: event.target.value })} placeholder="Nom du créateur ou outil…" maxLength={80} />
          </label>
          {options.platforms.length > 1 && (
            <label className="k-dir-net">
              <span className="k-sr">Réseau</span>
              <select className="k-board-select" value={filter.platform} onChange={event => update({ platform: event.target.value })}>
                <option value="">Tous les réseaux ({counts.all.platform})</option>
                {options.platforms.map(platform => <option key={platform} value={platform}>{PLATFORM_LABELS[platform]} ({counts.platform[platform] ?? 0})</option>)}
              </select>
            </label>
          )}
          <label className="k-dir-sort">
            <span className="k-sr">Trier par</span>
            <select className="k-board-select" value={filter.sort} onChange={event => update({ sort: event.target.value as DirectorySort })}>
              {SORTS.map(sort => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
            </select>
          </label>
        </div>
        {familyChips.length > 1 && (
          <ChipRow label="Familles">
            <button type="button" className="k-cat-chip" aria-pressed={!filter.family} onClick={() => update({ family: '' })}>
              Tous <span>{counts.all.family}</span>
            </button>
            {familyChips.map(family => (
              <button type="button" key={family.slug} className="k-cat-chip" aria-pressed={filter.family === family.slug}
                onClick={() => update({ family: filter.family === family.slug ? '' : family.slug })}>
                {family.name} <span>{counts.family[family.slug] ?? 0}</span>
              </button>
            ))}
          </ChipRow>
        )}
        <p className="k-dir-count" aria-live="polite">
          {plural(shown.length, 'créateur', 'créateurs')}
          {filtered && <button type="button" className="k-dir-reset" onClick={() => update(EMPTY)}>Tout afficher</button>}
        </p>
      </div>

      {podium.length > 0 && (
        <section className="k-dir-podium" aria-labelledby="k-dir-podium-title">
          <h2 id="k-dir-podium-title" className="k-dir-section">Les plus copiés ce mois-ci</h2>
          <ol className="k-dir-podium-list">
            {podium.map((entry, index) => <li key={entry.slug}><CreatorCard entry={entry} rank={index + 1} /></li>)}
          </ol>
        </section>
      )}

      {shown.length === 0 ? (
        <div className="k-empty">
          <h2>Aucun créateur pour ce choix.</h2>
          <p>Essaie un autre nom, un autre réseau ou une autre famille.</p>
          <button type="button" className="k-btn k-btn-ghost" onClick={() => update(EMPTY)}>Voir tous les créateurs</button>
        </div>
      ) : grid.length > 0 && (
        <>
          {podium.length > 0 && <h2 className="k-dir-section">Tous les créateurs</h2>}
          <ul className="k-dir-grid">
            {grid.slice(0, limit).map(entry => <li key={entry.slug}><CreatorCard entry={entry} /></li>)}
          </ul>
          {grid.length > limit && (
            <div className="k-dir-more">
              <button type="button" className="k-btn k-btn-ghost" onClick={() => setLimit(current => current + PAGE)}>
                Voir plus de créateurs <small>({grid.length - limit})</small>
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
