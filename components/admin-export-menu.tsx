'use client';
// Bouton « Exporter ▾ » des listes de l'admin : menu Excel ou CSV. Le fichier est produit par /api/admin/export.
import { useEffect, useId, useRef, useState } from 'react';
import type { ExportType } from '@/lib/admin-export';

const formats = [
  { format: 'xlsx', label: 'Excel', hint: '.xlsx · colonnes et filtres prêts' },
  { format: 'csv', label: 'CSV', hint: '.csv · pour tout tableur ou un import' },
] as const;

export function ExportMenu({ type }: { type: ExportType }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => {
      const items = Array.from(root.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? []);
      const index = items.indexOf(document.activeElement as HTMLAnchorElement);
      if (event.key === 'Escape') { setOpen(false); button.current?.focus(); }
      else if (event.key === 'ArrowDown') { event.preventDefault(); items[(index + 1) % items.length]?.focus(); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); items[(index - 1 + items.length) % items.length]?.focus(); }
      else if (event.key === 'Tab') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    root.current?.querySelector<HTMLAnchorElement>('[role="menuitem"]')?.focus();
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="adm-export" ref={root}>
      <button ref={button} type="button" className="adm-btn adm-export-btn" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(value => !value)}>
        Exporter
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="adm-export-menu" role="menu" id={menuId} aria-label="Format d’export">
          {formats.map(item => (
            <a key={item.format} role="menuitem" href={`/api/admin/export?type=${type}&format=${item.format}`} download onClick={() => setOpen(false)}>
              <b>{item.label}</b><span>{item.hint}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
