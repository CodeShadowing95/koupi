import Link from 'next/link';
import { isPublic } from '@/lib/data';
import { getCatalog } from '@/lib/catalog-server';
import { routes } from '@/lib/routes';
import { Hero } from '@/components/site/hero';
import { Marquee } from '@/components/site/marquee';
import { HowItWorks } from '@/components/site/how-it-works';
import { MiniCoupon } from '@/components/site/coupon';
import { ToolSeal } from '@/components/site/tool-logo';
import { Counter } from '@/components/site/counter';
import { CreatorAvatar } from '@/components/site/creator-avatar';

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export default async function Home() {
  const { categories, codes, tools } = await getCatalog();
  const live = codes.filter(isPublic);
  const featured = live.filter(code => code.status === 'verified').slice(0, 6);
  const creators = new Set(live.map(code => code.creator));
  const toolOf = (name: string) => tools.find(tool => tool.name === name);
  const best = [...live].sort((a, b) => b.success - a.success || b.votes - a.votes)[0];

  return (
    <main>
      <Hero codes={codes} tools={tools} />

      <div aria-hidden="true" style={{ position: 'relative', paddingBlock: 20 }}>
        <Marquee items={[...tools.map(tool => tool.name), ...tools.map(tool => tool.name)]} />
        <Marquee className="k-band-2" reverse items={[...creators, ...creators].map(name => `de ${name}`)} />
      </div>

      <section className="k-section">
        <div className="k-wrap">
          <div className="k-section-head is-center" data-reveal>
            <span className="k-eyebrow">Comment ça marche</span>
            <h2>Trois gestes, <span className="k-grad" style={{ whiteSpace: 'nowrap' }}>zéro code mort.</span></h2>
            <p>On ne t&apos;envoie pas sur un site rempli de faux boutons. Tu trouves, tu détaches, le créateur est payé.</p>
          </div>
          <HowItWorks />
        </div>
      </section>

      <section className="k-section" style={{ paddingTop: 40 }}>
        <div className="k-wrap">
          <div className="k-section-head" data-reveal>
            <span className="k-eyebrow">Codes du moment</span>
            <h2>Clique sur le talon,<br />c&apos;est copié.</h2>
            <p>Chaque code est celui d&apos;un créateur, avec la vidéo d&apos;où il vient. Monte le son.</p>
          </div>
          <div className="k-coupon-grid">
            {featured.map(code => {
              const tool = toolOf(code.tool);
              return (
                <div className="k-coupon-card" key={code.id} data-reveal>
                  <MiniCoupon
                    codeId={code.id}
                    key={code.id}
                    code={code.code}
                    link={code.creatorLink || tool?.website || '#'}
                    avatar={<ToolSeal tool={tool?.slug ?? code.tool} name={code.tool} />}
                    title={<>{code.tool} · {code.discount}</>}
                    subtitle={<span className="k-by"><CreatorAvatar name={code.creator} size="xs" />de {code.creator}</span>}
                  />
                  <div className="k-coupon-meta">
                    <span className="k-status k-status-ok is-dark">✓ Vérifié · {code.success} % de réussite</span>
                    {tool && <Link href={routes.tool(tool.slug)}>Voir la fiche →</Link>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="k-section">
        <div className="k-wrap">
          <div className="k-section-head" data-reveal>
            <span className="k-eyebrow">La règle Koupi</span>
            <h2>L&apos;inverse d&apos;un site<br />de coupons.</h2>
          </div>
          <div className="k-bento">
            <article className="k-tile k-tile-a" data-reveal>
              <span className="k-eyebrow">100 % pro-créateurs</span>
              <h3 style={{ fontSize: 38, maxWidth: 520 }}>Le code reste celui du créateur. Toujours.</h3>
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
              <div className="k-meter" style={{ marginTop: 'auto' }}><span style={{ width: `${best.success}%` }} /></div>
            </article>
            <article className="k-tile k-tile-e" data-reveal>
              <h3>Zéro pub, zéro faux bouton</h3>
              <p>Et on t&apos;explique comment on gagne de l&apos;argent. <Link className="k-link" href={routes.transparency}>Lire la page transparence</Link></p>
              <div className="k-no-ads" aria-hidden="true"><span>Bannière pub</span><span>Faux « Voir le code »</span><span>Pop-up</span><span>Code mort</span></div>
            </article>
          </div>
        </div>
      </section>

      <section className="k-section" style={{ paddingTop: 40 }}>
        <div className="k-wrap">
          <div className="k-section-head" data-reveal style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', maxWidth: 'none', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span className="k-eyebrow">Explorer</span>
              <h2>Par catégorie</h2>
            </div>
            <Link className="k-btn k-btn-ghost k-btn-sm" href={routes.categories}>Toutes les catégories <Arrow /></Link>
          </div>
          <div className="k-cat-grid">
            {categories.filter(category => category.count > 0).map(category => (
              <Link className="k-cat" href={routes.category(category.slug)} key={category.slug} data-reveal>
                <strong>{category.name}</strong>
                <span>{category.count} outils <Arrow /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="k-section" style={{ paddingTop: 40 }}>
        <div className="k-wrap">
          <div className="k-cta" data-reveal>
            <div>
              <span className="k-eyebrow">Contribuer</span>
              <h2 style={{ marginTop: 14 }}>Tu as vu passer un code dans une vidéo&nbsp;?</h2>
              <p>Envoie-le avec le lien de la vidéo. On le vérifie, on crédite le créateur, et il aide les suivants.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
              <Link className="k-btn k-btn-paper k-btn-ticket" href={routes.submit()} style={{ minHeight: 56, fontSize: 16, padding: '0 28px' }}>Proposer un code <Arrow /></Link>
              <Link className="k-link" href={routes.creator(best.creatorSlug)}>ou découvre les codes de {best.creator} →</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
