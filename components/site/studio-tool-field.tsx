'use client';
import { useEffect, useId, useState } from 'react';
import { fold, matchTools, MIN_CHARS, type ToolChoice } from '@/lib/studio-tools';
import { ToolLogo } from './tool-logo';

export type { ToolChoice };

/**
 * « Outil » du formulaire « Ajouter une offre » : il écrit le nom, Merkod propose les outils déjà sur le site dès 3 caractères.
 * Rien ne correspond ? Il garde son texte (et donne le site s'il veut) : Merkod ajoutera l'outil.
 * Envoie toolSlug (outil choisi) ou toolName (+ toolSite).
 */
export function StudioToolField({ tools, onNewTool }: { tools: ToolChoice[]; onNewTool?: (isNew: boolean) => void }) {
  const id = useId();
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<ToolChoice | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = picked ? [] : matchTools(tools, text);
  const exact = matches.find(tool => fold(tool.name) === fold(text)) ?? null;
  const listShown = open && matches.length > 0;
  // « Pas encore sur Merkod » n'apparaît qu'une fois la liste fermée : sinon il pousserait le formulaire pendant la saisie.
  const unknown = !picked && !exact && fold(text).length >= MIN_CHARS && !listShown;
  const listId = `${id}-list`;
  // Le champ « Site de l'outil » est ajouté par le formulaire en fin de grille : rien ne se décale sous ce champ.
  useEffect(() => { onNewTool?.(unknown); }, [unknown, onNewTool]);

  function choose(tool: ToolChoice) {
    setPicked(tool);
    setText(tool.name);
    setOpen(false);
  }

  function onKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!matches.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(index => (index + 1) % matches.length); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive(index => (index - 1 + matches.length) % matches.length); }
    else if (event.key === 'Enter' && open) { event.preventDefault(); choose(matches[active]); }
    else if (event.key === 'Escape') setOpen(false);
  }

  return (
    <div className="k-st-toolfield">
      <label htmlFor={`${id}-input`}>Outil <small>(écris son nom)</small></label>
      <div className={`k-st-combo${picked ? ' has-logo' : ''}${unknown ? ' is-new' : ''}`}>
        <input id={`${id}-input`} name="toolName" value={text} required maxLength={120} autoComplete="off" placeholder="Notion, Canva, NordVPN…"
          role="combobox" aria-expanded={listShown} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={open && matches.length ? `${id}-opt-${active}` : undefined}
          onChange={event => { setText(event.target.value); setPicked(null); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onKeyDown={onKey} />
        {picked && <ToolLogo tool={picked.slug} name={picked.name} className="k-st-combo-logo is-picked" />}
        {picked && <span className="k-st-combo-ok" title="Outil déjà sur Merkod">✓<span className="k-sr"> Outil déjà sur Merkod</span></span>}
        {unknown && <span className="k-st-combo-new" title="Pas encore sur Merkod : on l’ajoute, puis on relit ton offre.">Nouvel outil</span>}
        {listShown && (
          <ul id={listId} role="listbox" className="k-st-combo-list" aria-label="Outils déjà sur Merkod">
            {matches.map((tool, index) => (
              <li key={tool.slug} id={`${id}-opt-${index}`} role="option" aria-selected={index === active}
                className={index === active ? 'is-active' : undefined}
                onMouseDown={event => { event.preventDefault(); choose(tool); }} onMouseEnter={() => setActive(index)}>
                <ToolLogo tool={tool.slug} name={tool.name} className="k-st-combo-logo" />
                <span className="k-st-combo-text"><span>{tool.name}</span><small>{tool.site}</small></span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <input type="hidden" name="toolSlug" value={picked?.slug ?? exact?.slug ?? ''} />
    </div>
  );
}
