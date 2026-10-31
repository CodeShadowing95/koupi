import Link from 'next/link';
import { notFound } from 'next/navigation';
import { codes, tools } from '@/lib/data';
import { CopyButton } from '@/components/copy-button';
import { avatarClass, creatorSlug, initials, plural } from '@/lib/ui';

export default async function Creator({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = codes.find(code => creatorSlug(code.creator) === slug)?.creator;
  if (!creator) notFound();
  const creatorCodes = codes.filter(code => code.creator === creator && code.status !== 'pending');
  return (
    <main className="page">
      <div className="container">
        <Link className="back" href="/">← Accueil</Link>
        <div className="creator-head">
          <span className={`av av-lg ${avatarClass(creator)}`} aria-hidden="true">{initials(creator)}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 320px' }}>
            <span className="eyebrow">Créateur</span>
            <h1 style={{ margin: 0 }}>{creator}</h1>
            <p className="hero-copy">{plural(creatorCodes.length, 'code partagé', 'codes partagés')}, avec la vidéo ou le post d&apos;où il vient.</p>
          </div>
          <Link className="btn b-out" href="/trousseau">Ajouter à mon trousseau</Link>
        </div>
        <div className="code-list">
          {creatorCodes.map(code => {
            const tool = tools.find(item => item.name === code.tool);
            return (
              <article className="code-card" key={code.id}>
                <div>
                  <h3>{tool ? <Link href={`/outils/${tool.slug}`} style={{ color: 'var(--ink)' }}>{code.tool}</Link> : code.tool} · {code.discount}</h3>
                  <p>Source : <a href={code.source} target="_blank" rel="noopener noreferrer">{code.sourceTitle} ↗</a></p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                  <span className="code-pill">{code.code}</span>
                  {code.status === 'verified' ? <span className="status status-ok">Vérifié</span> : <span className="status status-warn">À tester</span>}
                </div>
                <CopyButton code={code.code} link={code.creatorLink || tool?.website || '#'} />
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
