import Link from '@/components/site/site-pages';
import { isPublic } from '@/lib/data';
import { getCatalog } from '@/lib/catalog-server';
import { routes } from '@/lib/routes';
import { Hero } from '@/components/site/hero';
import { Marquee } from '@/components/site/marquee';
import { HowItWorks } from '@/components/site/how-it-works';
import { FeaturedCodes } from '@/components/site/featured-codes';
import { Counter } from '@/components/site/counter';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { CreatorsOrbit } from '@/components/site/creators-orbit';
import { compactCount } from '@/lib/codes-board';
import { featuredPool } from '@/lib/featured-codes';
import { CreatorRotator } from '@/components/site/creator-rotator';
import { rotationCreators } from '@/lib/creator-rotation';
import { VoteInvite } from '@/components/site/vote-invite';

export default async function Home() {
  const { codes, tools } = await getCatalog();
  const live = codes.filter(isPublic);
  const featured = featuredPool(live);
  const creators = new Set(live.map(code => code.creator));
  const toolOf = (name: string) => tools.find(tool => tool.name === name);
  // Un créateur par entrée, avec son nombre de codes visibles et un exemple de code.
  const orbit = [...new Map(live.map(code => [code.creatorSlug, code])).values()].slice(0, 12).map(code => ({
    name: code.creator,
    slug: code.creatorSlug,
    codes: live.filter(other => other.creatorSlug === code.creatorSlug).length,
    tool: code.tool,
    discount: code.discount,
  }));
  const best = [...live].sort((a, b) => b.success - a.success || b.votes - a.votes)[0];

  return (
    <main>
      <Hero codes={codes} tools={tools} />

      <section className="k-section is-tight">
        <div className="k-wrap">
          <div className="k-section-head" data-reveal>
            <span className="k-eyebrow">Codes du moment</span>
            <h2>Clique sur le talon,<br />c&apos;est copié.</h2>
            <p>Chaque code est celui d&apos;un créateur, avec la vidéo d&apos;où il vient. Monte le son.</p>
          </div>
          <FeaturedCodes pool={featured.map(code => ({ code, link: code.creatorLink || toolOf(code.tool)?.website || '#' }))} />
          <div className="k-more" data-reveal>
            <Link className="k-more-ticket" href={routes.codes} aria-label={`Voir plus de codes : ${compactCount(live.length)} codes de créateurs, avec filtres et recherche`}>
              <span className="k-more-body" aria-hidden="true">
                <span className="k-more-main">
                  <small>Koupi</small>
                  <strong>Voir plus</strong>
                  <strong>de codes</strong>
                  <em>{compactCount(live.length)} codes de créateurs</em>
                </span>
                <span className="k-more-stub">
                  <small>Ouvrir</small>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </span>
              </span>
            </Link>
            <span className="k-more-shadow" aria-hidden="true" />
          </div>
        </div>
      </section>

      <div aria-hidden="true" className="k-bands">
        <Marquee items={[...tools.map(tool => tool.name), ...tools.map(tool => tool.name)]} />
        <Marquee className="k-band-2" reverse speed={330} items={[...creators, ...creators].map(name => `de ${name}`)} />
      </div>

      <HowItWorks example={featured[0] && { tool: featured[0].tool, code: featured[0].code, discount: featured[0].discount, creator: featured[0].creator }} />

      <CreatorsOrbit creators={orbit} total={creators.size} />

      <section className="k-section">
        <div className="k-wrap">
          <div className="k-section-head" data-reveal>
            <span className="k-eyebrow">La règle Koupi</span>
            <h2>L&apos;inverse d&apos;un site<br />de coupons.</h2>
          </div>
          <div className="k-bento">
            <article className="k-tile k-tile-a" data-reveal>
              <span className="k-eyebrow">100 % pro-créateurs</span>
              <h3 className="k-tile-title">Le code reste celui du créateur. Toujours.</h3>
              <p>On ne remplace jamais son code par un code à nous. Son lien est ouvert tel quel, sans suivi ajouté : sa commission lui revient.</p>
              <div className="k-flow" aria-hidden="true">
                <span className="k-flow-node"><span className="k-av k-av-3">TU</span>Toi</span>
                <span className="k-flow-line" />
                <span className="k-flow-node"><span className="k-tool-logo">K</span>Koupi</span>
                <span className="k-flow-line" />
                <span className="k-flow-node"><CreatorAvatar name={best.creator} />{best.creator}</span>
              </div>
            </article>
            <article className="k-tile k-tile-b" data-reveal>
              <span className="k-big-num"><Counter value={tools.length} /></span>
              <h3>outils suivis</h3>
              <p>Hébergement, VPN, IA, formation…</p>
            </article>
            <article className="k-tile k-tile-c" data-reveal>
              <span className="k-big-num"><Counter value={creators.size} /></span>
              <h3>créateurs crédités</h3>
              <p>Chaque code renvoie vers sa vidéo.</p>
            </article>
            <article className="k-tile k-tile-d" data-reveal>
              <h3>Testé, daté, voté</h3>
              <p>de {best.creator} pour {best.tool} marche pour {best.success} % des {best.votes} personnes qui ont voté.</p>
              <div className="k-meter is-bottom"><span style={{ width: `${best.success}%` }} /></div>
            </article>
            <article className="k-tile k-tile-e" data-reveal>
              <h3>Zéro pub, zéro faux bouton</h3>
              <p>Et on t&apos;explique comment on gagne de l&apos;argent. <Link className="k-link" href={routes.transparency}>Lire la page transparence</Link></p>
              <div className="k-no-ads" aria-hidden="true"><span>Bannière pub</span><span>Faux « Voir le code »</span><span>Pop-up</span><span>Code mort</span></div>
            </article>
          </div>
        </div>
      </section>

      <section className="k-section is-tight">
        <div className="k-wrap">
          <div className="k-cta" data-reveal>
            <div>
              <span className="k-eyebrow">Contribuer</span>
              <h2>Tu as vu passer un code dans une vidéo&nbsp;?</h2>
              <p>Envoie-le avec le lien de la vidéo. On le vérifie, on crédite le créateur, et il aide les suivants.</p>
            </div>
            <div className="k-cta-actions">
              <Link className="k-nav-coupon is-large" href={routes.submit()}>
                <span className="k-nav-coupon-main k-paper">Proposer un code</span>
                <span className="k-nav-coupon-stub" aria-hidden="true">%</span>
              </Link>
              <CreatorRotator creators={rotationCreators(live, best.creatorSlug)} />
            </div>
          </div>
        </div>
      </section>
      <VoteInvite trigger="copy" />
    </main>
  );
}
