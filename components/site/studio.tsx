'use client';
// Merkod Studio : la coque de l'espace créateur (colonne de navigation, barre du haut) et ses pièces interactives.
// Pas d'en-tête ni de pied de page du site : on est « dans les coulisses », comme un studio.
import { SiteLogo } from '@/components/site/site-logo';
import { ThemeToggle } from '@/components/site/theme-toggle';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { CreatorMark } from '@/components/site/creator-mark';
import { SignOutButton } from '@/components/site/creator-space-actions';
import type { CreatorLevel } from '@/lib/verification';
import { routes } from '@/lib/routes';

export type StudioIcon = 'home' | 'codes' | 'page' | 'rosette' | 'proof' | 'search' | 'gift';
export type StudioNavItem = { id: string; label: string; icon: StudioIcon };

export function StudioGlyph({ name }: { name: StudioIcon }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (name) {
    case 'home': return <svg {...common}><path d="M4 20V10l8-6 8 6v10" /><path d="M9 20v-6h6v6" /></svg>;
    case 'codes': return <svg {...common}><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 0 0 5V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 0 0-5z" /><path d="M14 6v12" strokeDasharray="2 2.4" /></svg>;
    case 'page': return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" /></svg>;
    case 'rosette': return <svg {...common}><path d="M12 2.5l2.2 1.7 2.8-.3.9 2.7 2.3 1.5-.8 2.7.8 2.7-2.3 1.5-.9 2.7-2.8-.3L12 19.1l-2.2-1.7-2.8.3-.9-2.7-2.3-1.5.8-2.7-.8-2.7 2.3-1.5.9-2.7 2.8.3z" /><path d="m8.6 10.9 2.3 2.3 4.4-4.5" /></svg>;
    case 'proof': return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h5" /><path d="m13 17 2 2 4-4" /></svg>;
    case 'search': return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
    case 'gift': return <svg {...common}><path d="M4 12h16v8H4zM3 8h18v4H3zM12 8v12" /><path d="M12 8c-2-4-6-4-6-1.5S10 8 12 8Zm0 0c2-4 6-4 6-1.5S14 8 12 8Z" /></svg>;
  }
}

/** Section visible au défilement : la dernière dont le haut est passé sous le premier tiers de l'écran. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? '');
  useEffect(() => {
    const onScroll = () => {
      let current = ids[0] ?? '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight / 3) current = id;
      }
      // Tout en bas de la page, la dernière section est la bonne même si elle est courte.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = ids.at(-1) ?? current;
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [ids]);
  return active;
}

type ShellProps = {
  email: string;
  creator: { name: string; slug: string; level: CreatorLevel } | null;
  nav: StudioNavItem[];
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function StudioShell({ email, creator, nav, title, actions, children }: ShellProps) {
  const ids = nav.map(item => item.id);
  const [key] = useState(() => ids.join('|'));
  const active = useActiveSection(key.split('|'));
  return (
    <div className="kp k-st">
      <a className="k-skip" href="#studio-main">Aller au contenu</a>
      <aside className="k-st-side" aria-label="Merkod Studio">
        <Link className="k-st-brand" href={routes.creatorSpace} aria-label="Merkod Studio, tableau de bord">
          <SiteLogo priority />
          <span className="k-st-badge">Studio</span>
        </Link>

        <div className="k-st-me">
          {creator ? <CreatorAvatar name={creator.name} size="md" /> : <span className="k-st-me-empty" aria-hidden="true"><StudioGlyph name="page" /></span>}
          <div>
            <b>{creator ? creator.name : 'Ton studio'}</b>
            {creator && creator.level !== 'spotted' ? <CreatorMark level={creator.level === 'verified' ? 'verified' : 'checked'} dark /> : <small>{creator ? 'Page reliée' : 'Pas encore de page'}</small>}
          </div>
        </div>

        <nav className="k-st-nav" aria-label="Sections du studio">
          {nav.map(item => (
            <a key={item.id} className="k-st-link" href={`#${item.id}`} aria-current={active === item.id ? 'location' : undefined}>
              <StudioGlyph name={item.icon} /><span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="k-st-side-foot">
          {creator && <Link className="k-st-link" href={routes.creator(creator.slug)} target="_blank"><StudioGlyph name="page" /><span>Ma page publique ↗</span></Link>}
          <Link className="k-st-link" href={routes.home}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg><span>Retour au site</span></Link>
          <p className="k-st-email">{email}<br /><SignOutButton /></p>
        </div>
      </aside>

      <div className="k-st-body">
        <header className="k-st-bar">
          <h1 className="k-st-title">{title}</h1>
          <div className="k-st-bar-actions">{actions}<ThemeToggle /></div>
        </header>
        <main className="k-st-main" id="studio-main">{children}</main>
      </div>
    </div>
  );
}

/** Courbe des copies des 30 derniers jours : une barre par jour, le jour survolé (ou choisi au clavier) détaillé en haut. */
export function CopiesChart({ series }: { series: { day: string; count: number }[] }) {
  const max = Math.max(1, ...series.map(item => item.count));
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? series.length - 1;
  const label = (day: string) => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
  const total = series.reduce((sum, item) => sum + item.count, 0);
  const W = 600, H = 180, gap = 4;
  const bar = (W - gap * (series.length - 1)) / series.length;
  return (
    <figure className="k-st-chart">
      <figcaption>
        <span className="k-st-chart-day">{hover === null ? 'Aujourd’hui' : label(series[shown].day)}</span>
        <b>{series[shown]?.count ?? 0}</b> <span>copie{(series[shown]?.count ?? 0) > 1 ? 's' : ''}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-label={`Copies par jour sur 30 jours : ${total} au total`} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="k-st-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8C9BFF" /><stop offset="1" stopColor="#3A4BE0" /></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map(step => <line key={step} x1="0" x2={W} y1={H - H * step} y2={H - H * step} className="k-st-grid" />)}
        {series.map((item, index) => {
          const h = item.count === 0 ? 2 : Math.max(4, (item.count / max) * (H - 8));
          const x = index * (bar + gap);
          const today = index === series.length - 1;
          return (
            <g key={item.day} onMouseEnter={() => setHover(index)}>
              <rect x={x} y={0} width={bar + gap} height={H} fill="transparent" />
              <rect className={`k-st-col${today ? ' is-today' : ''}${hover === index ? ' is-hover' : ''}`} x={x} y={H - h} width={bar} height={h} rx={Math.min(4, bar / 2)} />
              {(index % 7 === 2 || today) && <text x={x + bar / 2} y={H + 16} textAnchor="middle" className="k-st-axis">{today ? 'auj.' : label(item.day).replace(/^\S+\s/, '')}</text>}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** Anneau de progression vers la rosette « Créateur vérifié ». */
export function RosetteRing({ percent, reached }: { percent: number; reached: boolean }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className={`k-st-ring${reached ? ' is-reached' : ''}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={r} className="k-st-ring-track" />
        <circle cx="60" cy="60" r={r} className="k-st-ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} transform="rotate(-90 60 60)" />
      </svg>
      <span className="k-st-ring-in">
        <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><path className="k-rosette-shape" d="M12 1.8l2.5 1.9 3.1-.3 1 3 2.6 1.7-.9 3 .9 3-2.6 1.7-1 3-3.1-.3L12 22.2l-2.5-1.9-3.1.3-1-3-2.6-1.7.9-3-.9-3 2.6-1.7 1-3 3.1.3z" /><path className="k-rosette-check" d="m7.8 12.3 2.9 2.9 5.5-5.7" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <b>{percent} %</b>
      </span>
    </div>
  );
}
