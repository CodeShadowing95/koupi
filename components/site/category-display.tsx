import Link from 'next/link';
import type { Code, Tool } from '@/lib/data';
import { topCodesFor } from '@/lib/category-display';
import { routes } from '@/lib/routes';
import { ToolLogo } from '@/components/site/tool-logo';

// « Par catégorie » en présentoir : chaque catégorie est un porte-coupons.
// Ses trois meilleurs codes dépassent du présentoir ; au survol (ou au focus clavier),
// ils sortent en éventail pour montrer la réduction et le code. Au repos, le meilleur code dépasse déjà assez pour se lire.
// Tout est en CSS (transitions), donc rien ne bouge avec « réduire les animations ».

type Props = {
  categories: { slug: string; name: string; count: number }[];
  tools: Tool[];
  codes: Code[];
};

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export function CategoryDisplay({ categories, tools, codes }: Props) {
  return (
    <div className="k-display-grid">
      {categories.map(category => {
        const top = topCodesFor(category.name, tools, codes);
        const logos = tools.filter(tool => tool.category === category.name).slice(0, 4);
        const best = top[0];
        return (
          <Link className="k-display" href={routes.category(category.slug)} key={category.slug} data-reveal>
            <span className="k-display-fan" aria-hidden="true">
              {top.map((code, i) => (
                <span className={`k-display-ticket k-display-ticket-${i + 1}`} key={code.id}>
                  <ToolLogo tool={code.toolSlug} name={code.tool} />
                  <span className="k-display-ticket-text">
                    <strong>{code.discount}</strong>
                    <small>{code.tool}</small>
                  </span>
                  <span className="k-display-ticket-code k-mono">{code.code}</span>
                </span>
              ))}
            </span>
            <span className="k-display-front">
              <span className="k-display-logos" aria-hidden="true">
                {logos.map(tool => <ToolLogo key={tool.slug} tool={tool.slug} name={tool.name} />)}
              </span>
              <strong className="k-display-name">{category.name}</strong>
              {best && <span className="k-display-best"><small>Meilleur code</small><em>{best.discount}</em></span>}
              <span className="k-display-foot">
                {category.count} {category.count > 1 ? 'outils' : 'outil'}
                {top.length > 0 && <> · {top.length} {top.length > 1 ? 'codes à détacher' : 'code à détacher'}</>}
                <Arrow />
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
