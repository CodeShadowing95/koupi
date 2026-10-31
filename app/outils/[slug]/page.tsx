import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findTool, toolCodes, type Code } from '@/lib/data';
import { CodeTicket, CopyButton } from '@/components/copy-button';
import { avatarClass, creatorSlug, initials } from '@/lib/ui';

function StatusBadge({ status }: { status: Code['status'] }) {
  if (status === 'verified') return <span className="status status-ok"><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5L6.5 12L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>Vérifié</span>;
  return <span className="status status-warn"><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M8 5V8.5L10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>À tester</span>;
}

function votesLabel(code: Code) {
  return code.votes < 3 ? 'Pas encore assez de votes' : `Marche pour ${code.success} % des ${code.votes} personnes qui ont voté.`;
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = findTool(slug);
  if (!tool) notFound();
  const active = toolCodes(tool.name).filter(code => code.status !== 'pending');
  const sorted = [...active].sort((a, b) => (a.status === 'verified' ? 0 : 1) - (b.status === 'verified' ? 0 : 1) || b.success - a.success);
  const [best, ...others] = sorted;

  return (
    <main className="page">
      <div className="container tool-layout">
        <section className="tool-main">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="muted" style={{ fontSize: 15 }}>
              <Link href="/" style={{ color: 'inherit' }}>Accueil</Link> · {tool.name} · {tool.category.toLowerCase()}
            </span>
            {best ? (
              <h1 className="h" style={{ fontSize: 'clamp(38px,5vw,52px)', margin: 0, lineHeight: 1 }}>
                {best.status === 'verified' ? <>Le code de {best.creator}<br />marche.</> : <>Le code de {best.creator}<br />est à tester.</>}
              </h1>
            ) : (
              <h1 className="h" style={{ fontSize: 'clamp(38px,5vw,52px)', margin: 0, lineHeight: 1 }}>Pas encore de code<br />pour {tool.name}.</h1>
            )}
            <p className="muted" style={{ margin: 0 }}>{tool.description} <a href={tool.website} target="_blank" rel="noopener noreferrer">Site officiel ↗</a></p>
          </div>

          {best ? (
            <CodeTicket code={best.code} link={best.creatorLink || tool.website} creator={best.creator} discount={best.discount} tool={tool.name}>
              <div className="offer-who">
                <span className={`av ${avatarClass(best.creator)}`} style={{ width: 48, height: 48 }} aria-hidden="true">{initials(best.creator)}</span>
                <span>
                  <strong><Link href={`/createurs/${creatorSlug(best.creator)}`} style={{ color: 'var(--ink)' }}>{best.creator}</Link></strong>
                  <span>l&apos;a donné dans « {best.sourceTitle} » · <a href={best.source} target="_blank" rel="noopener noreferrer">voir la source ↗</a></span>
                </span>
              </div>
              <span className="offer-discount">{best.discount}</span>
              <div className="offer-meta"><StatusBadge status={best.status} /><span>{votesLabel(best)}</span></div>
            </CodeTicket>
          ) : (
            <div className="empty">
              <h2>Aucun code pour cet outil pour l&apos;instant.</h2>
              <p>Tu connais un code donné par un créateur ? Propose-le, on le vérifie avant de le publier.</p>
              <Link className="btn b-ink" href={`/proposer?tool=${tool.slug}`}>Proposer un code</Link>
            </div>
          )}

          {others.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
              <h2 className="h" style={{ fontSize: 26, margin: 0 }}>Les autres codes {tool.name}</h2>
              <div className="code-list">
                {others.map(code => (
                  <article className="code-card" key={code.id}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <span className={`av ${avatarClass(code.creator)}`} aria-hidden="true">{initials(code.creator)}</span>
                      <div>
                        <h3><Link href={`/createurs/${creatorSlug(code.creator)}`} style={{ color: 'var(--ink)' }}>{code.creator}</Link> · {code.discount}</h3>
                        <p><a href={code.source} target="_blank" rel="noopener noreferrer">{code.sourceTitle} ↗</a></p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                      <span className="code-pill">{code.code}</span>
                      <StatusBadge status={code.status} />
                    </div>
                    <CopyButton code={code.code} link={code.creatorLink || tool.website} />
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="tool-aside">
          <div className="card card-strong">
            <h2>Et si ce code meurt avant ton renouvellement ?</h2>
            <p>Bientôt, on pourra te prévenir par e-mail avec le prochain code qui marche. Sans compte, avec un lien pour te désinscrire dans chaque message.</p>
          </div>
          {others.length > 0 && (
            <div className="card">
              <span className="eyebrow">Les autres codes {tool.name}</span>
              {others.map(code => (
                <span className="other-code" key={code.id}><span>{code.creator}</span><span className="mono">{code.discount}</span></span>
              ))}
            </div>
          )}
          <div className="card">
            <span className="eyebrow">La règle Koupi</span>
            <p>Chaque code reste celui du créateur. Son lien est ouvert tel quel, sans suivi ajouté par Koupi.</p>
            <Link className="text-link" href={`/proposer?tool=${tool.slug}`}>Signaler un problème ou proposer un code →</Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
