import Link from 'next/link';
import { Search } from '@/components/search';
import { categories, codes, tools } from '@/lib/data';
import { avatarClass, initials } from '@/lib/ui';

const tilts = ['tilt-a', 'tilt-b', 'tilt-c'];

export default function Home() {
  const popular = tools.slice(0, 8);
  const latest = codes.filter(code => code.status === 'verified').slice(0, 3);
  const slugOf = (name: string) => tools.find(tool => tool.name === name)?.slug ?? '';
  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-text">
            <h1>Tu vas payer<br />quel outil ?</h1>
            <p className="hero-copy">Tape son nom. On te sort le code du créateur qui en a parlé, vérifié à la main. Pas de compte, pas de pub.</p>
            <Search />
            <div className="chips">
              <span className="chips-label">Populaires :</span>
              {tools.slice(0, 4).map(tool => <Link className="chip" href={`/outils/${tool.slug}`} key={tool.slug}>{tool.name}</Link>)}
            </div>
          </div>
          <section className="hero-tickets" aria-labelledby="tickets-title">
            <span className="eyebrow" id="tickets-title">Derniers codes vérifiés</span>
            {latest.map((code, index) => (
              <Link className={`tk ${tilts[index % tilts.length]}`} href={`/outils/${slugOf(code.tool)}`} key={code.id}>
                <div className="tk-main">
                  <span className={`av ${avatarClass(code.creator)}`} aria-hidden="true">{initials(code.creator)}</span>
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong style={{ color: 'var(--ink)', fontSize: 16 }}>{code.tool}, {code.discount}</strong>
                    <span>le code de {code.creator}</span>
                  </span>
                </div>
                <div className="tk-code">{code.code}</div>
              </Link>
            ))}
          </section>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Les outils les plus suivis</h2>
              <p className="section-intro">Chaque fiche affiche le code du créateur, sa source et sa date de vérification.</p>
            </div>
            <Link className="text-link" href="/categories">Tout voir</Link>
          </div>
          <div className="tool-grid">
            {popular.map(tool => (
              <Link className="tool-card" href={`/outils/${tool.slug}`} key={tool.slug}>
                <div className="tool-card-top">
                  <span className="tool-logo" aria-hidden="true">{tool.name.slice(0, 1).toUpperCase()}</span>
                  <div><h3>{tool.name}</h3><p>{tool.category}</p></div>
                </div>
                <div className="tool-card-foot">
                  <span className="muted">{tool.codes} code{tool.codes > 1 ? 's' : ''}</span>
                  <span className="text-link" aria-hidden="true">Voir →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><h2>Parcourir par catégorie</h2></div>
          <div className="category-grid">
            {categories.map(category => (
              <Link className="category-card" href={`/categories/${category.slug}`} key={category.slug}>{category.name} <span>{category.count}</span></Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container promise-grid">
          <div className="promise"><strong>Le code reste celui du créateur</strong><span>On ne le remplace jamais par un code à nous. Sa commission lui revient.</span></div>
          <div className="promise"><strong>Testé, daté, voté</strong><span>Chaque code affiche sa source, sa dernière vérification et l&apos;avis de ceux qui l&apos;ont utilisé.</span></div>
          <div className="promise"><strong>Zéro pub, zéro faux bouton</strong><span>On t&apos;explique comment on gagne de l&apos;argent. <Link href="/transparence">Lire la page transparence</Link></span></div>
        </div>
      </section>
    </main>
  );
}
