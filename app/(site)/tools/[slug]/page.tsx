import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findTool, toolCodes, type Code } from '@/lib/data';
import { routes } from '@/lib/routes';
import { avatarClass, creatorSlug, initials } from '@/lib/ui';
import { MiniCoupon, TearTicket } from '@/components/site/coupon';

function StatusBadge({ status, dark = false }: { status: Code['status']; dark?: boolean }) {
  if (status === 'verified') return <span className={`k-status k-status-ok${dark ? ' is-dark' : ''}`}>✓ Vérifié</span>;
  return <span className={`k-status k-status-warn${dark ? ' is-dark' : ''}`}>◷ À tester</span>;
}

function votesLabel(code: Code) {
  return code.votes < 3 ? 'Pas encore assez de votes pour un taux de réussite.' : `Marche pour ${code.success} % des ${code.votes} personnes qui ont voté.`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = findTool(slug);
  return tool ? { title: `Code promo ${tool.name} · Koupi` } : {};
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = findTool(slug);
  if (!tool) notFound();
  const active = toolCodes(tool.name).filter(code => code.status !== 'pending');
  const sorted = [...active].sort((a, b) => (a.status === 'verified' ? 0 : 1) - (b.status === 'verified' ? 0 : 1) || b.success - a.success);
  const [best, ...others] = sorted;

  return (
    <main className="k-page">
      <div className="k-wrap">
        <nav className="k-crumbs" aria-label="Fil d'Ariane">
          <Link href={routes.home}>Accueil</Link><span aria-hidden="true">/</span>
          <Link href={routes.categories}>{tool.category}</Link><span aria-hidden="true">/</span>
          <span aria-current="page" style={{ color: 'var(--text)' }}>{tool.name}</span>
        </nav>
        <div className="k-tool-layout" style={{ marginTop: 28 }}>
          <section>
            <div className="k-tool-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span className="k-tool-logo" aria-hidden="true">{tool.name.slice(0, 1).toUpperCase()}</span>
                <span className="k-eyebrow">Code promo {tool.name}</span>
              </div>
              {best ? (
                <h1>Le code de {best.creator}<br />{best.status === 'verified' ? <em>marche.</em> : <em className="is-warn">est à tester.</em>}</h1>
              ) : (
                <h1>Pas encore de code<br />pour {tool.name}.</h1>
              )}
              <p>{tool.description} <a className="k-link" href={tool.website} target="_blank" rel="noopener noreferrer">Site officiel ↗</a></p>
            </div>

            {best ? (
              <TearTicket code={best.code} link={best.creatorLink || tool.website} creator={best.creator} discount={best.discount} tool={tool.name}>
                <div className="k-ticket-who">
                  <span className={`k-av k-${avatarClass(best.creator)}`} style={{ width: 52, height: 52 }} aria-hidden="true">{initials(best.creator)}</span>
                  <span>
                    <strong><Link href={routes.creator(creatorSlug(best.creator))}>{best.creator}</Link></strong>
                    <span>l&apos;a donné dans « {best.sourceTitle} » · <a href={best.source} target="_blank" rel="noopener noreferrer">voir la vidéo ↗</a></span>
                  </span>
                </div>
                <span className="k-ticket-discount">{best.discount}</span>
                <div className="k-ticket-meta"><StatusBadge status={best.status} /><span>Lien du créateur ouvert tel quel</span></div>
                <div className="k-ticket-votes">
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{votesLabel(best)}</span>
                  {best.votes >= 3 && <div className="k-meter"><span style={{ width: `${best.success}%` }} /></div>}
                </div>
              </TearTicket>
            ) : (
              <div className="k-empty">
                <h2>Aucun code pour cet outil pour l&apos;instant.</h2>
                <p>Tu connais un code donné par un créateur ? Propose-le, on le vérifie avant de le publier.</p>
                <Link className="k-btn k-btn-paper k-btn-ticket" href={routes.submit(tool.slug)}>Proposer un code</Link>
              </div>
            )}

            {others.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 64 }}>
                <h2 style={{ fontSize: 32 }} data-reveal>Les autres codes {tool.name}</h2>
                <div className="k-code-list">
                  {others.map(code => (
                    <div className="k-coupon-card" key={code.id} data-reveal>
                      <MiniCoupon
                        className="k-row-coupon"
                        code={code.code}
                        link={code.creatorLink || tool.website}
                        avatar={<span className={`k-av k-${avatarClass(code.creator)}`} aria-hidden="true">{initials(code.creator)}</span>}
                        title={<>{code.creator} · {code.discount}</>}
                        subtitle={code.sourceTitle}
                      />
                      <div className="k-coupon-meta">
                        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><StatusBadge status={code.status} dark />{votesLabel(code)}</span>
                        <a href={code.source} target="_blank" rel="noopener noreferrer">Source ↗</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="k-aside">
            <div className="k-panel k-panel-glow">
              <span className="k-eyebrow">Bientôt</span>
              <h2>Et si ce code meurt avant ton renouvellement&nbsp;?</h2>
              <p>On pourra te prévenir par e-mail avec le prochain code qui marche. Sans compte, avec un lien pour te désinscrire dans chaque message.</p>
            </div>
            <div className="k-panel">
              <span className="k-eyebrow">La règle Koupi</span>
              <p>Chaque code reste celui du créateur. Son lien est ouvert tel quel, sans suivi ajouté par Koupi.</p>
              <Link className="k-link" href={routes.submit(tool.slug)}>Signaler un problème ou proposer un code →</Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
