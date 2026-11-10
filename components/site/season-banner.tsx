'use client';
// Bannière saisonnière d'Explorer (lib/season-banner.ts) : Black Friday, Noël puis les soldes d'hiver, avec de vrais outils et leur réduction.
// Elle mène à la page de la saison. La croix la ferme pour la saison, dans ce navigateur.
import { useEffect, useState } from 'react';
import Link from '@/components/site/site-pages';
import { ToolLogo } from '@/components/site/tool-logo';
import { routes } from '@/lib/routes';
import { blackFridayDate } from '@/lib/black-friday';
import { christmasDate } from '@/lib/christmas';
import { winterSalesStart } from '@/lib/sales';
import { seasonDismissKey, type BannerPick, type Season } from '@/lib/season-banner';

// Ce qui change d'une saison à l'autre : le jour J, la page, les mots.
const SEASONS = {
  'black-friday': { day: blackFridayDate, now: 'C’est maintenant', href: routes.blackFriday, cta: 'Voir les codes Black Friday', name: 'Black Friday', className: 'k-sb-bf',
    lead: 'Le code de créateur le plus fiable de chaque outil, à comparer avec la promo du vendredi.' },
  christmas: { day: christmasDate, now: 'Joyeux Noël', href: routes.christmas, cta: 'Voir les codes de Noël', name: 'de Noël', className: 'k-sb-xmas',
    lead: 'Un abonnement à offrir ? Le code de créateur le plus fiable de chaque outil, vérifié.' },
  sales: { day: winterSalesStart, now: 'C’est parti', href: routes.sales, cta: 'Voir les codes des soldes', name: 'des soldes', className: 'k-sb-sales',
    lead: 'Le code de créateur le plus fiable de chaque outil, à comparer avec les prix soldés.' },
} as const;

const countdown = (season: Season) => {
  if (season.daysLeft === 0) return SEASONS[season.kind].now;
  return season.daysLeft === 1 ? 'Demain' : `J-${season.daysLeft}`;
};
const dayOf = (season: Season) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  .format(SEASONS[season.kind].day(season.year));

function SantaHat() {
  return (
    <svg className="k-sb-hat" viewBox="0 0 120 100" aria-hidden="true">
      <path d="M14 78 C 30 30, 62 8, 96 22 C 82 30, 80 48, 92 70 Z" fill="#E3262E" />
      <path d="M40 40 C 54 26, 72 20, 90 24" fill="none" stroke="#B31B22" strokeWidth="5" strokeLinecap="round" />
      <rect x="6" y="70" width="96" height="22" rx="11" fill="#FFF8EE" />
      <circle cx="100" cy="24" r="13" fill="#FFF8EE" />
    </svg>
  );
}

export function SeasonBanner({ season, picks }: { season: Season; picks: BannerPick[] }) {
  const [open, setOpen] = useState(false);
  const key = seasonDismissKey(season);
  useEffect(() => {
    try { setOpen(window.localStorage.getItem(key) !== 'closed'); } catch { setOpen(true); }
  }, [key]);
  if (!open) return null;
  const close = () => {
    setOpen(false);
    try { window.localStorage.setItem(key, 'closed'); } catch { /* stockage indisponible : elle reviendra à la prochaine visite */ }
  };
  const christmas = season.kind === 'christmas';
  const look = SEASONS[season.kind];
  const href = look.href;

  return (
    <section className={`k-sb ${look.className}`} aria-labelledby="k-sb-title">
      <div className="k-sb-copy">
        <span className="k-sb-kicker"><b>{countdown(season)}</b> {dayOf(season)} {season.year}</span>
        {season.kind === 'christmas' && <h2 className="k-sb-title" id="k-sb-title">Les codes <em>à offrir</em> pour Noël</h2>}
        {season.kind === 'black-friday' && <h2 className="k-sb-title" id="k-sb-title"><span className="k-sb-outline">Black</span> Friday</h2>}
        {season.kind === 'sales' && <h2 className="k-sb-title" id="k-sb-title">Les <em>soldes</em> d’hiver</h2>}
        <p className="k-sb-lead">{look.lead}</p>
        <Link className="k-sb-cta" href={href}>{look.cta}<span aria-hidden="true">→</span></Link>
      </div>
      <Link className="k-sb-art" href={href} tabIndex={-1} aria-hidden="true">
        {christmas ? <SantaHat /> : <span className="k-sb-percent">%</span>}
        {picks.map((pick, index) => (
          <span key={pick.toolSlug} className={`k-sb-tag k-sb-tag-${index + 1}`}>
            {christmas && <span className="k-sb-ribbon" />}
            <ToolLogo tool={pick.toolSlug} name={pick.tool} />
            <span className="k-sb-tag-text"><b>{pick.tool}</b><small>{pick.discount}</small></span>
          </span>
        ))}
      </Link>
      <button type="button" className="k-sb-close" onClick={close} aria-label={`Fermer la bannière ${look.name}`}>×</button>
    </section>
  );
}
