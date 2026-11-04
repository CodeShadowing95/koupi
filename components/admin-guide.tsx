// Briques des chapitres du guide de l'admin : encadrés, étapes numérotées, exemples d'écran.
import type { ReactNode } from 'react';

type CalloutTone = 'tip' | 'warn' | 'rule' | 'why';
const calloutLabel: Record<CalloutTone, string> = { tip: 'Astuce', warn: 'Attention', rule: 'Règle d’or', why: 'Pourquoi c’est important' };
const calloutIcon: Record<CalloutTone, string> = { tip: '💡', warn: '⚠️', rule: '★', why: '?' };

/** Encadré de couleur : astuce, piège à éviter, règle d'or ou explication. */
export function Callout({ tone, title, children }: { tone: CalloutTone; title?: string; children: ReactNode }) {
  return (
    <aside className={`gd-callout is-${tone}`}>
      <span className="gd-callout-icon" aria-hidden="true">{calloutIcon[tone]}</span>
      <div>
        <b>{title ?? calloutLabel[tone]}</b>
        <div className="gd-callout-body">{children}</div>
      </div>
    </aside>
  );
}

/** Pas à pas numéroté. Chaque enfant est une étape (Step). */
export function Steps({ children }: { children: ReactNode }) {
  return <ol className="gd-steps">{children}</ol>;
}

export function Step({ title, children }: { title: string; children?: ReactNode }) {
  return <li><b>{title}</b>{children && <div>{children}</div>}</li>;
}

/** Cadre « à l'écran » : montre les vrais éléments de l'interface pour qu'on les reconnaisse. */
export function Demo({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="gd-demo">
      <div className="gd-demo-stage">{children}</div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/** Tableau à deux colonnes « ce que tu vois → ce que ça veut dire ». */
export function Legend({ rows }: { rows: { term: ReactNode; meaning: ReactNode }[] }) {
  return (
    <dl className="gd-legend">
      {rows.map((row, index) => <div key={index}><dt>{row.term}</dt><dd>{row.meaning}</dd></div>)}
    </dl>
  );
}

/** Touche du clavier. */
export function Key({ children }: { children: ReactNode }) {
  return <kbd className="gd-key">{children}</kbd>;
}

/** Section d'un chapitre, avec un titre ancré. */
export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="gd-section" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}
