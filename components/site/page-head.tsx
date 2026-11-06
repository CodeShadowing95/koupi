import Link from '@/components/site/site-pages';
import type { ReactNode } from 'react';
import { routes } from '@/lib/routes';
import { breadcrumbLd } from '@/lib/structured-data';
import { siteUrl } from '@/lib/seo';
import { JsonLd } from '@/components/json-ld';

export type Crumb = { label: string; href?: string };

/** Fil d'Ariane du site public : commence toujours par l'accueil, la dernière étape est la page en cours.
 * Le même fil est donné à Google en données structurées (BreadcrumbList). */
export function Crumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ label: 'Accueil', href: routes.home }, ...items];
  return (
    <>
    <JsonLd data={breadcrumbLd(all, siteUrl())} />
    <nav className="k-crumbs" aria-label="Fil d'Ariane">
      {all.map((item, index) => {
        const last = index === all.length - 1;
        return (
          <span className="k-crumb" key={`${item.label}-${index}`}>
            {last || !item.href ? <span aria-current={last ? 'page' : undefined}>{item.label}</span> : <Link href={item.href}>{item.label}</Link>}
            {!last && <span aria-hidden="true">/</span>}
          </span>
        );
      })}
    </nav>
    </>
  );
}

type Props = {
  /** Petit sur-titre au-dessus du titre (« Explorer », « Créateurs »…). */
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  crumbs?: Crumb[];
  /** Contenu ajouté sous la phrase d'introduction (une barre de recherche, par exemple). */
  children?: ReactNode;
  className?: string;
};

/** En-tête commun des pages du site public : fil d'Ariane, sur-titre, titre, phrase d'introduction. */
export function PageHead({ eyebrow, title, lead, crumbs, children, className }: Props) {
  return (
    <>
      {crumbs && <Crumbs items={crumbs} />}
      <header className={`k-page-head${crumbs ? ' has-crumbs' : ''}${className ? ` ${className}` : ''}`}>
        {eyebrow && <span className="k-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {lead && <p>{lead}</p>}
        {children}
      </header>
    </>
  );
}
