import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categories, codes, isPublic, tools } from '@/lib/data';
import { routes } from '@/lib/routes';
import { MiniCoupon } from '@/components/site/coupon';
import { ToolSeal } from '@/components/site/tool-logo';
import { ToolCard } from '@/components/site/tool-card';

export default async function Category({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categories.find(item => item.slug === slug);
  if (!category) notFound();
  const categoryTools = tools.filter(tool => tool.category === category.name);
  const categoryCodes = codes.filter(code => isPublic(code) && categoryTools.some(tool => tool.name === code.tool));
  return (
    <main className="k-page">
      <div className="k-wrap">
        <nav className="k-crumbs" aria-label="Fil d'Ariane"><Link href={routes.categories}>Catégories</Link><span aria-hidden="true">/</span><span aria-current="page" style={{ color: 'var(--text)' }}>{category.name}</span></nav>
        <div className="k-page-head" style={{ marginTop: 24 }}>
          <span className="k-eyebrow">Catégorie</span>
          <h1>{category.name}</h1>
          <p>Compare les codes des créateurs pour les outils de cette catégorie.</p>
        </div>
        {categoryTools.length === 0 ? (
          <div className="k-empty"><h2>Pas encore d&apos;outil ici.</h2><p>Tu connais un code pour un outil de cette catégorie ?</p><Link className="k-btn k-btn-paper k-btn-ticket" href={routes.submit()}>Proposer un code</Link></div>
        ) : (
          <>
            {categoryCodes.length > 0 && (
              <div className="k-coupon-grid" style={{ marginBottom: 72 }}>
                {categoryCodes.map(code => {
                  const tool = categoryTools.find(item => item.name === code.tool);
                  return (
                    <div className="k-coupon-card" key={code.id} data-reveal>
                      <MiniCoupon
                        code={code.code}
                        link={code.creatorLink || tool?.website || '#'}
                        avatar={<ToolSeal tool={tool?.slug ?? code.tool} name={code.tool} />}
                        title={<>{code.tool} · {code.discount}</>}
                        subtitle={<>le code de {code.creator}</>}
                      />
                      <div className="k-coupon-meta">
                        <span className={`k-status ${code.status === 'verified' ? 'k-status-ok' : 'k-status-warn'} is-dark`}>{code.status === 'verified' ? '✓ Vérifié' : '◷ À tester'}</span>
                        {tool && <Link href={routes.tool(tool.slug)}>Voir la fiche →</Link>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <h2 style={{ fontSize: 30, marginBottom: 22 }} data-reveal>Les outils</h2>
            <div className="k-tool-grid">{categoryTools.map(tool => <ToolCard tool={tool} key={tool.slug} />)}</div>
          </>
        )}
      </div>
    </main>
  );
}
