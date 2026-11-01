'use client';
// Tri et filtre par initiale des listes du back-office.
// useAdminSort garde l'état ; SortControl (menu + sens), LetterBar (A…Z, 0-9, #) et SortHeader (titres de colonnes) l'affichent.
import { useMemo, useState } from 'react';
import { AdminSelect } from '@/components/admin-select';
import { LETTERS, countByInitial, filterByInitial, sortItems, type SortDir, type SortField } from '@/lib/admin-sort';

export type { SortField };

export type AdminSort<T> = {
  items: T[];
  fields: SortField<T>[];
  field: SortField<T>;
  dir: SortDir;
  letter: string;
  letterField: SortField<T>;
  counts: Map<string, number>;
  total: number;
  /** À ajouter à la clé de pagination : on revient à la page 1 quand le tri ou la lettre change. */
  resetKey: string;
  sortBy: (key: string) => void;
  setDir: (dir: SortDir) => void;
  setLetter: (letter: string) => void;
};

/**
 * @param initial critère et sens au chargement
 * @param letterKey critère texte utilisé par la barre alphabet quand le tri porte sur un nombre ou une date
 */
export function useAdminSort<T>(items: T[], fields: SortField<T>[], initial: { key: string; dir: SortDir }, letterKey: string): AdminSort<T> {
  const [key, setKey] = useState(initial.key);
  const [dir, setDir] = useState<SortDir>(initial.dir);
  const [letter, setLetterState] = useState('');
  const field = fields.find(item => item.key === key) ?? fields[0];
  const letterField = field.text ? field : fields.find(item => item.key === letterKey) ?? field;

  const counts = useMemo(() => countByInitial(items, letterField.value), [items, letterField]);
  const sorted = useMemo(() => sortItems(filterByInitial(items, letterField.value, letter), field.value, dir), [items, letterField, letter, field, dir]);

  function sortBy(next: string) {
    if (next === key) { setDir(current => (current === 'asc' ? 'desc' : 'asc')); return; }
    const nextField = fields.find(item => item.key === next);
    if (!nextField) return;
    // La lettre choisie ne veut plus rien dire si elle porte maintenant sur un autre champ.
    const nextLetterField = nextField.text ? nextField : fields.find(item => item.key === letterKey) ?? nextField;
    if (nextLetterField.key !== letterField.key) setLetterState('');
    setKey(next);
    setDir(nextField.defaultDir ?? 'asc');
  }

  return {
    items: sorted, fields, field, dir, letter, letterField, counts, total: items.length,
    resetKey: `${field.key}|${dir}|${letter}`,
    sortBy, setDir, setLetter: setLetterState,
  };
}

function Arrow({ dir }: { dir: SortDir }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d={dir === 'asc' ? 'M12 19V5m-6 6 6-6 6 6' : 'M12 5v14m-6-6 6 6 6-6'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const dirLabel = (text: boolean | undefined, dir: SortDir) => (text ? (dir === 'asc' ? 'A → Z' : 'Z → A') : dir === 'asc' ? 'Croissant' : 'Décroissant');

export function SortControl<T>({ sort, id }: { sort: AdminSort<T>; id: string }) {
  return (
    <div className="adm-sort" role="group" aria-label="Tri">
      <span className="adm-sort-label" aria-hidden="true">Trier par</span>
      <AdminSelect
        id={id} variant="filter" ariaLabel="Trier par" value={sort.field.key} onChange={sort.sortBy}
        options={sort.fields.map(item => ({ value: item.key, label: item.label }))} searchPlaceholder="Rechercher un critère…"
      />
      <button
        type="button" className="adm-btn adm-sort-dir" onClick={() => sort.setDir(sort.dir === 'asc' ? 'desc' : 'asc')}
        aria-label={`Ordre ${sort.dir === 'asc' ? 'croissant' : 'décroissant'}, cliquer pour inverser`} title="Inverser l’ordre"
      >
        <Arrow dir={sort.dir} />{dirLabel(sort.field.text, sort.dir)}
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

/** Titre de colonne cliquable en vue Tableau. */
export function SortHeader<T>({ sort, field, children }: { sort: AdminSort<T>; field: string; children: React.ReactNode }) {
  const active = sort.field.key === field;
  return (
    <th scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className={`adm-th-sort${active ? ' is-active' : ''}`} onClick={() => sort.sortBy(field)}>
        {children}
        <span className="adm-th-arrow"><Arrow dir={active ? sort.dir : 'asc'} /></span>
      </button>
    </th>
  );
}
