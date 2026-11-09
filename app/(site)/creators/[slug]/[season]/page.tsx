import type { Metadata } from 'next';
import Link from '@/components/site/site-pages';
import { notFound } from 'next/navigation';
import { getCatalog } from '@/lib/catalog-server';
import { blackFridayDate, frenchDay } from '@/lib/black-friday';
import { christmasDate } from '@/lib/christmas';
import { daysUntil } from '@/lib/season-banner';
import { KIT_LABEL, kitCodes, kitKindOf, kitPath, kitYear, type KitKind } from '@/lib/season-kit';
import { routes } from '@/lib/routes';
import { plural } from '@/lib/ui';
import { Crumbs } from '@/components/site/page-head';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { CreatorMark } from '@/components/site/creator-mark';
import { BoardingCoupon } from '@/components/site/boarding-coupon';
import { SeasonHat } from '@/components/site/season-codes';
import { VoteInvite } from '@/components/site/vote-invite';

type Params = { params: Promise<{ slug: string; season: string }> };

// Kit de saison d'un créateur : ses codes du moment, aux couleurs de l'événement, sur un lien à partager.
async function load(slug: string, season: string) {
  const kind = kitKindOf(season);
  if (!kind) return null;
  const { codes, tools } = await getCatalog();
  const own = codes.filter(code => code.creatorSlug === slug);
  if (!own.length) return null;
  const now = new Date();
  return { kind, now, year: kitYear(kind, now), creator: own[0].creator, level: own[0].creatorLevel, picks: kitCodes(own, now), tools };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, season } = await params;
  const data = await load(slug, season);
  if (!data) return {};
  const label = KIT_LABEL[data.kind];
  const title = `Codes promo ${label} ${data.year} de ${data.creator} · Merkod`;
  const description = `${plural(data.picks.length, 'code promo', 'codes promo')} de ${data.creator} pour ${label} ${data.year}, chacun vérifié et relié à la vidéo d’où il vient.`;
  return { title, description, alternates: { canonical: kitPath(slug, data.kind) }, openGraph: { title, description } };
}

function eyebrow(kind: KitKind, year: number, now: Date) {
  const day = kind === 'noel' ? christmasDate(year) : blackFridayDate(year);
  const left = daysUntil(day, now);
  return left > 0 ? `J-${left} · ${KIT_LABEL[kind]} ${year}` : `${KIT_LABEL[kind]} ${year}`;
}

export default async function CreatorSeason({ params }: Params) {
  const { slug, season } = await params;
  const data = await load(slug, season);
  if (!data) notFound();
  const { kind, now, year, creator, level, picks, tools } = data;
  const christmas = kind === 'noel';
  return (
    <main className={`k-page k-season ${christmas ? 'k-season-xmas' : 'k-season-bf'}`}>
      <div className="k-wrap">
        <Crumbs items={[{ label: creator, href: routes.creator(slug) }, { label: KIT_LABEL[kind] }]} />
        <header className="k-page-head k-season-head k-kit-head">
          <span className="k-eyebrow">{eyebrow(kind, year, now)}</span>
          <div className="k-kit-who">
            <CreatorAvatar name={creator} size="lg" />
            <div>
              <h1>{christmas
                ? <>Les codes de <span className="k-season-hatted">Noël<SeasonHat /></span> de {creator}</>
                : <>Les codes <span className="k-season-outline">Black</span> Friday de {creator}</>}</h1>
              {level && <CreatorMark level={level} dark />}
            </div>
          </div>
          <p>{picks.length
            ? `${plural(picks.length, 'code promo donné', 'codes promo donnés')} par ${creator} dans ses vidéos et ses posts, chacun vérifié par Merkod et relié à sa source.`
            : `${creator} n’a pas de code en cours pour l’instant.`}</p>
        </header>
        <p className="k-bf-note">
          {christmas
            ? 'Ces codes marchent toute l’année : parfaits pour offrir un abonnement ou bien démarrer l’année. En utilisant le code du créateur, c’est lui que tu soutiens.'
            : 'Ces codes marchent toute l’année : pendant le Black Friday, compare-les avec la promo affichée par l’outil et garde la meilleure. En utilisant le code du créateur, c’est lui que tu soutiens.'}
        </p>
        {picks.length > 0 && (
          <ul className="k-pass-grid k-kit-grid">
            {picks.map(code => {
              const tool = tools.find(item => item.slug === code.toolSlug);
              return <li key={code.id}><BoardingCoupon code={code} category={tool?.category ?? ''} link={code.creatorLink || tool?.website || '#'} /></li>;
            })}
          </ul>
        )}
        <div className="k-kit-more">
          <Link className="k-btn k-btn-primary" href={routes.creator(slug)}>Toute la page de {creator}</Link>
          <Link className="k-btn k-btn-ghost" href={christmas ? routes.christmas : routes.blackFriday}>Tous les codes {christmas ? 'de Noël' : 'Black Friday'}</Link>
        </div>
      </div>
      <VoteInvite trigger="copy" />
    </main>
  );
}
