import type { Metadata } from 'next';
import Link from '@/components/site/site-pages';
import { notFound } from 'next/navigation';
import { isPublic, type Code } from '@/lib/data';
import { getCatalog } from '@/lib/catalog-server';
import { routes } from '@/lib/routes';
import { isTrusted, sortToolCodes, toolPageDescription, toolPageTitle, votesSummary } from '@/lib/tool-page';
import { MiniCoupon, TearTicket } from '@/components/site/coupon';
import { ToolSeal } from '@/components/site/tool-logo';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { VoteButtons } from '@/components/site/vote-buttons';
import { CodeBadge } from '@/components/site/code-badge';
import { CreatorMark } from '@/components/site/creator-mark';
import { Crumbs } from '@/components/site/page-head';

function votesLabel(code: Code) {
  return votesSummary(code) ? `${votesSummary(code)}.` : 'Pas encore assez de votes pour un taux de réussite.';
}

async function toolCodes(slug: string) {
  const { tools, codes, categories } = await getCatalog();
  const tool = tools.find(item => item.slug === slug);
  if (!tool) return null;
  const sorted = sortToolCodes(codes.filter(code => code.toolSlug === tool.slug && isPublic(code)));
  return { tool, sorted, category: categories.find(item => item.name === tool.category) };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const found = await toolCodes(slug);
  if (!found) return {};
  const title = toolPageTitle(found.tool.name, found.sorted[0]);
  const description = toolPageDescription(found.tool.name, found.sorted[0], found.sorted.length);
  return { title, description, alternates: { canonical: routes.tool(slug) }, openGraph: { title, description } };
}

// Fiche outil : la page où l'on arrive en cherchant « code promo <outil> ». L'essentiel d'abord (outil, réduction,
// le code à copier), la preuve ensuite (vidéo, votes), puis les autres codes.
export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await toolCodes(slug);
  if (!found) notFound();
  const { tool, sorted, category } = found;
  const [best, ...others] = sorted;

  return (
    <main className="k-page">
      <div className="k-wrap">
        <Crumbs items={[{ label: tool.category, href: category ? routes.category(category.slug) : routes.categories }, { label: tool.name }]} />
        <div className="k-tool-layout">
          <section>
            <div className="k-tool-head">
              <div className="k-tool-kicker">
                <ToolSeal tool={tool.slug} name={tool.name} />
                <span className="k-eyebrow">{sorted.length > 1 ? `${sorted.length} codes de créateurs` : best ? 'Le code d’un créateur' : tool.category}</span>
              </div>
              <h1>
                Code promo {tool.name}
                {best && <em className={isTrusted(best) ? undefined : 'is-warn'}>{best.discount}</em>}
              </h1>
              {best ? (
                <p className="k-tool-proof">
                  <CodeBadge code={best} dark />
                  <span>donné par <Link href={routes.creator(best.creatorSlug)}>{best.creator}</Link><CreatorMark level={best.creatorLevel} compact /></span>
                </p>
              ) : (
                <p>Pas encore de code donné par un créateur pour {tool.name}.</p>
              )}
            </div>

            {best ? (
              <TearTicket code={best.code} codeId={best.id} link={best.creatorLink || tool.website} creator={best.creator} discount={best.discount} tool={tool.name} seal={<ToolSeal tool={tool.slug} name={tool.name} size="lg" />}>
                <div className="k-ticket-who">
                  <CreatorAvatar name={best.creator} className="k-ticket-avatar" />
                  <span>
                    <strong><Link href={routes.creator(best.creatorSlug)}>{best.creator}</Link><CreatorMark level={best.creatorLevel} compact /></strong>
                    <span className="k-ticket-source">l&apos;a donné dans « {best.sourceTitle} »</span>
                  </span>
                </div>
                <span className="k-ticket-discount">{best.discount}</span>
                <div className="k-ticket-meta"><span>Lien du créateur ouvert tel quel</span></div>
              </TearTicket>
            ) : (
              <div className="k-empty">
                <h2>Aucun code pour cet outil pour l&apos;instant.</h2>
                <p>Tu connais un code donné par un créateur ? Propose-le, on le vérifie avant de le publier.</p>
                <Link className="k-btn k-btn-paper k-btn-ticket" href={routes.submit(tool.slug)}>Proposer un code</Link>
              </div>
            )}

            {best && (
              <div className="k-tool-check">
                <div className="k-tool-check-text">
                  <strong>{votesLabel(best)}</strong>
                  {best.votes >= 3 && <div className="k-meter"><span style={{ width: `${best.success}%` }} /></div>}
                  <a className="k-link" href={best.source} target="_blank" rel="noopener noreferrer">Voir la vidéo d&apos;où vient le code ↗</a>
                </div>
                <VoteButtons code={best} />
              </div>
            )}

            {others.length > 0 && (
              <div className="k-tool-others">
                <h2 data-reveal>Les autres codes {tool.name}</h2>
                <div className="k-code-list">
                  {others.map(code => (
                    <div className="k-coupon-card" key={code.id} data-reveal>
                      <MiniCoupon
                        codeId={code.id}
                        className="k-row-coupon"
                        code={code.code}
                        link={code.creatorLink || tool.website}
                        avatar={<CreatorAvatar name={code.creator} />}
                        title={<>{code.creator}<CreatorMark level={code.creatorLevel} compact /> · {code.discount}</>}
                        subtitle={code.sourceTitle}
                      />
                      <div className="k-coupon-meta">
                        <span className="k-coupon-meta-group"><CodeBadge code={code} dark />{votesLabel(code)}</span>
                        <a href={code.source} target="_blank" rel="noopener noreferrer">Source ↗</a>
                        <VoteButtons code={code} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="k-aside">
            <div className="k-panel">
              <span className="k-eyebrow">{tool.category}</span>
              <h2>{tool.name}</h2>
              <p>{tool.description}</p>
              <a className="k-link" href={tool.website} target="_blank" rel="noopener noreferrer">Site officiel ↗</a>
            </div>
            <div className="k-panel">
              <span className="k-eyebrow">La règle Koupi</span>
              <p>Chaque code reste celui du créateur. Son lien est ouvert tel quel, sans suivi ajouté par Koupi : sa commission lui revient.</p>
              <Link className="k-link" href={routes.submit(tool.slug)}>Signaler un problème ou proposer un code →</Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
