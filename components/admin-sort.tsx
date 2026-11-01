'use client';
// Tri et filtre par initiale des listes du back-office.
// En vue Tableau, chaque titre de colonne triable porte une icône : 1er clic croissant, 2e décroissant, 3e retour à l'ordre normal.
// En vue Cartes (pas de titres de colonnes), SortControl offre le même choix dans un menu.
// LetterBar filtre par initiale : A…Z, 0-9 (chiffre), # (symbole).
import { useMemo, useState } from 'react';
import { AdminSelect } from '@/components/admin-select';
import { LETTERS, countByInitial, filterByInitial, sortItems, type SortDir, type SortField } from '@/lib/admin-sort';

export type { SortField };

export type AdminSort<T> = {
  items: T[];
  fields: SortField<T>[];
  /** null : ordre normal de la liste. */
  field: SortField<T> | null;
  dir: SortDir;
  letter: string;
  letterField: SortField<T>;
  counts: Map<string, number>;
  total: number;
  /** À ajouter à la clé de pagination : on revient à la page 1 quand le tri ou la lettre change. */
  resetKey: string;
  /** Croissant, puis décroissant, puis ordre normal. */
  cycle: (key: string) => void;
  choose: (key: string) => void;
  setDir: (dir: SortDir) => void;
  setLetter: (letter: string) => void;
};

/** @param letterKey champ texte utilisé par la barre alphabet quand la liste n'est pas triée sur un texte */
export function useAdminSort<T>(items: T[], fields: SortField<T>[], letterKey: string): AdminSort<T> {
  const [key, setKey] = useState<string | null>(null);
  const [dir, setDir] = useState<SortDir>('asc');
  const [letter, setLetter] = useState('');
  const field = fields.find(item => item.key === key) ?? null;
  const fallback = fields.find(item => item.key === letterKey) ?? fields[0];
  const letterField = field?.text ? field : fallback;

  const counts = useMemo(() => countByInitial(items, letterField.value), [items, letterField]);
  const sorted = useMemo(() => {
    const kept = filterByInitial(items, letterField.value, letter);
    return field ? sortItems(kept, field.value, dir) : kept;
  }, [items, letterField, letter, field, dir]);

  function apply(next: string | null, nextDir: SortDir) {
    const nextField = fields.find(item => item.key === next);
    // La lettre choisie ne veut plus rien dire si elle porte maintenant sur un autre champ.
    const nextLetterField = nextField?.text ? nextField : fallback;
    if (nextLetterField.key !== letterField.key) setLetter('');
    setKey(nextField ? nextField.key : null);
    setDir(nextDir);
  }

  return {
    items: sorted, fields, field, dir, letter, letterField, counts, total: items.length,
    resetKey: `${field?.key ?? ''}|${dir}|${letter}`,
    cycle: next => (next !== key ? apply(next, 'asc') : dir === 'asc' ? setDir('desc') : apply(null, 'asc')),
    choose: next => apply(next || null, 'asc'),
    setDir, setLetter,
  };
}

function SortIcon({ state }: { state: SortDir | null }) {
  const path = state === 'asc' ? 'M12 19V5m-6 6 6-6 6 6' : state === 'desc' ? 'M12 5v14m-6-6 6 6 6-6' : 'M8 20V4M4 8l4-4 4 4M16 4v16m-4-4 4 4 4-4';
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const nextStep = (state: SortDir | null) => (state === null ? 'Trier par ordre croissant' : state === 'asc' ? 'Trier par ordre décroissant' : 'Revenir à l’ordre normal');

/** Titre de colonne cliquable en vue Tableau. */
export function SortHeader<T>({ sort, field, children }: { sort: AdminSort<T>; field: string; children: React.ReactNode }) {
  const state = sort.field?.key === field ? sort.dir : null;
  return (
    <th scope="col" aria-sort={state === 'asc' ? 'ascending' : state === 'desc' ? 'descending' : undefined}>
      <button type="button" className={`adm-th-sort${state ? ' is-active' : ''}`} onClick={() => sort.cycle(field)} title={nextStep(state)}>
        {children}
        <span className="adm-th-arrow"><SortIcon state={state} /></span>
      </button>
    </th>
  );
}

/** Choix du tri en vue Cartes. */
export function SortControl<T>({ sort, id }: { sort: AdminSort<T>; id: string }) {
  const state = sort.field ? sort.dir : null;
  return (
    <div className="adm-sort" role="group" aria-label="Tri">
      <AdminSelect
        id={id} variant="filter" ariaLabel="Trier par" value={sort.field?.key ?? ''} onChange={sort.choose}
        options={[{ value: '', label: 'Ordre normal' }, ...sort.fields.map(item => ({ value: item.key, label: `Trier par : ${item.label.toLowerCase()}` }))]}
        searchPlaceholder="Rechercher un critère…"
      />
      <button
        type="button" className="adm-btn adm-sort-dir" disabled={!sort.field} aria-pressed={sort.dir === 'desc'}
        onClick={() => sort.setDir(sort.dir === 'asc' ? 'desc' : 'asc')}
        aria-label={sort.dir === 'asc' ? 'Ordre croissant, passer en décroissant' : 'Ordre décroissant, passer en croissant'}
        title={sort.field ? (sort.dir === 'asc' ? 'Croissant (cliquer pour décroissant)' : 'Décroissant (cliquer pour croissant)') : 'Choisis d’abord un critère'}
      >
        <SortIcon state={state} />
      </button>
    </div>
  );
}

export function LetterBar<T>({ sort }: { sort: AdminSort<T> }) {
  const choose = (letter: string) => sort.setLetter(sort.letter === letter ? '' : letter);
  return (
    <div className="adm-letters" role="group" aria-label={`Filtrer par initiale : ${sort.letterField.label.toLowerCase()}`}>
      <span className="adm-letters-label">Initiale · {sort.letterField.label}</span>
      <div className="adm-letters-row">
        <button type="button" className="adm-letter adm-letter-all" aria-pressed={sort.letter === ''} onClick={() => sort.setLetter('')} title={`${sort.total} au total`}>Tous</button>
        {LETTERS.map(letter => {
          const count = sort.counts.get(letter) ?? 0;
          const name = letter === '0-9' ? 'chiffre' : letter === '#' ? 'symbole' : letter;
          return (
            <button
              key={letter} type="button" className="adm-letter" aria-pressed={sort.letter === letter}
              disabled={count === 0 && sort.letter !== letter} onClick={() => choose(letter)}
              title={count === 0 ? `Aucun résultat (${name})` : `${count} résultat${count > 1 ? 's' : ''} (${name})`}
              aria-label={`${name}, ${count} résultat${count > 1 ? 's' : ''}`}
            >{letter}</button>
          );
        })}
      </div>
    </div>
  );
}
