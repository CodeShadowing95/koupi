'use client';
import { useId, useState } from 'react';
import { fold, matchTools, MIN_CHARS, type ToolChoice } from '@/lib/studio-tools';

export type { ToolChoice };

/**
 * « Outil » du formulaire « Ajouter une offre » : il écrit le nom, Merkod propose les outils déjà sur le site dès 3 caractères.
 * Rien ne correspond ? Il garde son texte (et donne le site s'il veut) : Merkod ajoutera l'outil.
 * Envoie toolSlug (outil choisi) ou toolName (+ toolSite).
 */
export function StudioToolField({ tools }: { tools: ToolChoice[] }) {
  const id = useId();
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<ToolChoice | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = picked ? [] : matchTools(tools, text);
  const exact = matches.find(tool => fold(tool.name) === fold(text)) ?? null;
  const unknown = !picked && !exact && fold(text).length >= MIN_CHARS;
  const listId = `${id}-list`;

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
    <div className="k-st-tool">
      <label htmlFor={`${id}-input`}>Outil <small>(écris son nom)</small></label>
      <div className="k-st-combo">
        <input id={`${id}-input`} name="toolName" value={text} required maxLength={120} autoComplete="off" placeholder="Notion, Canva, NordVPN…"
          role="combobox" aria-expanded={open && matches.length > 0} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={open && matches.length ? `${id}-opt-${active}` : undefined}
          onChange={event => { setText(event.target.value); setPicked(null); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onKeyDown={onKey} />
        {picked && <span className="k-st-combo-ok" aria-hidden="true">✓</span>}
        {open && matches.length > 0 && (
          <ul id={listId} role="listbox" className="k-st-combo-list" aria-label="Outils déjà sur Merkod">
            {matches.map((tool, index) => (
              <li key={tool.slug} id={`${id}-opt-${index}`} role="option" aria-selected={index === active}
                className={index === active ? 'is-active' : undefined}
                onMouseDown={event => { event.preventDefault(); choose(tool); }} onMouseEnter={() => setActive(index)}>
                <span>{tool.name}</span><small>{tool.site}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
      <input type="hidden" name="toolSlug" value={picked?.slug ?? exact?.slug ?? ''} />
      {picked && <small className="k-st-tool-note">Outil déjà sur Merkod.</small>}
      {unknown && (
        <div className="k-st-tool-new">
          <small className="k-st-tool-note">{matches.length ? 'Pas dans la liste ? Garde ton texte : ' : 'Pas encore sur Merkod : '}on l’ajoute, puis on relit ton offre.</small>
          <label>Site de l’outil <small>(facultatif, ça nous aide)</small><input name="toolSite" inputMode="url" maxLength={300} placeholder="notion.so" /></label>
        </div>
      )}
    </div>
  );
}
