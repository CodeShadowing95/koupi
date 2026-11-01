import Link from 'next/link';
import { notFound } from 'next/navigation';
import { codes, isPublic, tools } from '@/lib/data';
import { routes } from '@/lib/routes';
import { avatarClass, creatorSlug, initials, plural } from '@/lib/ui';
import { ToolSeal } from '@/components/site/tool-logo';
import { MiniCoupon } from '@/components/site/coupon';

export default async function Creator({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = codes.find(code => creatorSlug(code.creator) === slug)?.creator;
  if (!creator) notFound();
  const creatorCodes = codes.filter(code => code.creator === creator && isPublic(code));
  return (
    <main className="k-page">
      <div className="k-wrap">
        <nav className="k-crumbs" aria-label="Fil d'Ariane"><Link href={routes.home}>Accueil</Link><span aria-hidden="true">/</span><span aria-current="page" style={{ color: 'var(--text)' }}>{creator}</span></nav>
        <div className="k-creator-head" style={{ marginTop: 28 }}>
          <span className={`k-av k-av-lg k-${avatarClass(creator)}`} aria-hidden="true">{initials(creator)}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 320px' }}>
            <span className="k-eyebrow">Créateur</span>
            <h1 style={{ fontSize: 'clamp(40px,5vw,64px)' }}>{creator}</h1>
            <p style={{ color: 'var(--text-soft)', fontSize: 18 }}>{plural(creatorCodes.length, 'code partagé', 'codes partagés')}, chacun avec la vidéo ou le post d&apos;où il vient.</p>
          </div>
          <Link className="k-btn k-btn-ghost" href={routes.keyring}>Ajouter à mon trousseau</Link>
        </div>
        <div className="k-code-list">
          {creatorCodes.map(code => {
            const tool = tools.find(item => item.name === code.tool);
            return (
              <div className="k-coupon-card" key={code.id} data-reveal>
                <MiniCoupon
                  className="k-row-coupon"
                  code={code.code}
                  link={code.creatorLink || tool?.website || '#'}
                  avatar={<ToolSeal tool={tool?.slug ?? code.tool} name={code.tool} />}
                  title={<>{code.tool} · {code.discount}</>}
                  subtitle={code.sourceTitle}
                />
                <div className="k-coupon-meta">
                  <span className={`k-status ${code.status === 'verified' ? 'k-status-ok' : 'k-status-warn'} is-dark`}>{code.status === 'verified' ? '✓ Vérifié' : '◷ À tester'}</span>
                  <span style={{ display: 'flex', gap: 16 }}>
                    <a href={code.source} target="_blank" rel="noopener noreferrer">Source ↗</a>
                    {tool && <Link href={routes.tool(tool.slug)}>Fiche {tool.name} →</Link>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
