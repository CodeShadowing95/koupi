'use client';
// Bouton « ⋮ » d'un coupon détaillé, à côté des pouces : voir la source, la fiche de l'outil, la page du créateur,
// partager, signaler. Le menu s'ouvre dans la couche du dessus (popover) pour ne pas être rogné par les perforations du coupon.
import Link from '@/components/site/site-pages';
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { codeMenuItems, type CodeMenuKey } from '@/lib/code-menu';
import { copyText } from '@/lib/copy';
import { routes } from '@/lib/routes';

type MenuCode = { source: string; toolSlug: string; creatorSlug: string; tool: string; creator: string; code: string };

function MenuIcon({ name }: { name: CodeMenuKey }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'source') return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9 5 3-5 3z" /></svg>;
  if (name === 'tool') return <svg {...common}><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 0 0 5V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 0 0-5z" /></svg>;
  if (name === 'creator') return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6" /></svg>;
  if (name === 'share') return <svg {...common}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" /></svg>;
  return <svg {...common}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>;
}

export function CodeMenu({ code, platform, linkTool = true }: { code: MenuCode; platform: string | null; linkTool?: boolean }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('');
  const items = codeMenuItems(code, platform, { linkTool });

  useEffect(() => {
    const panel = menu.current;
    if (!panel) return;
    // À l'ouverture : on place le menu sous le bouton (aligné à droite) et on met le focus sur le premier choix.
    const onToggle = (event: Event) => {
      const open = (event as ToggleEvent).newState === 'open';
      button.current?.setAttribute('aria-expanded', String(open));
      if (!open) return;
      const box = button.current?.getBoundingClientRect();
      if (box) {
        const width = panel.offsetWidth;
        const left = Math.max(8, Math.min(window.innerWidth - width - 8, box.right - width));
        const below = box.bottom + 6;
        const top = below + panel.offsetHeight > window.innerHeight - 8 ? Math.max(8, box.top - panel.offsetHeight - 6) : below;
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
      }
      panel.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab') { panel.hidePopover(); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const list = [...panel.querySelectorAll<HTMLElement>('[role="menuitem"]')];
      event.preventDefault();
      const at = list.indexOf(document.activeElement as HTMLElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : (at + (event.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
      list[next]?.focus();
    };
    panel.addEventListener('toggle', onToggle);
    panel.addEventListener('keydown', onKey);
    return () => { panel.removeEventListener('toggle', onToggle); panel.removeEventListener('keydown', onKey); };
  }, []);

  const close = () => { menu.current?.hidePopover(); button.current?.focus(); };

  const share = async () => {
    const url = new URL(routes.tool(code.toolSlug), window.location.origin).toString();
    const text = code.code ? `Code promo ${code.tool} de ${code.creator} : ${code.code}` : `Offre ${code.tool} de ${code.creator}`;
    close();
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: `Code promo ${code.tool}`, text, url }); return; } catch { /* partage annulé : rien à faire */ return; }
    }
    setStatus((await copyText(url)) ? 'Lien copié' : 'Copie impossible');
    window.setTimeout(() => setStatus(''), 2500);
  };

  return (
    <>
      <button ref={button} type="button" className="k-pass-more" popoverTarget={id} aria-haspopup="menu" aria-expanded="false"
        aria-label={`Plus d’options pour le code ${code.tool}`} title="Plus d’options">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
      </button>
      <div ref={menu} id={id} popover="auto" role="menu" aria-label={`Options du code ${code.tool}`} className="k-pass-menu">
        {items.map(item => item.key === 'share'
          ? <button key={item.key} type="button" role="menuitem" className="k-pass-menu-item" onClick={share}><MenuIcon name={item.key} />{item.label}</button>
          : item.external
          ? <a key={item.key} role="menuitem" className="k-pass-menu-item" href={item.href} target="_blank" rel="noopener noreferrer" onClick={close}><MenuIcon name={item.key} />{item.label}<span className="k-sr"> (nouvel onglet)</span></a>
          : item.key === 'report'
          ? <Fragment key={item.key}><div className="k-pass-menu-sep" role="separator" /><Link role="menuitem" className="k-pass-menu-item is-report" href={item.href ?? '#'} onClick={close}><MenuIcon name={item.key} />{item.label}</Link></Fragment>
          : <Link key={item.key} role="menuitem" className="k-pass-menu-item" href={item.href ?? '#'} onClick={close}><MenuIcon name={item.key} />{item.label}</Link>)}
      </div>
      <span className="k-sr" role="status">{status}</span>
      {status && <span className="k-pass-menu-toast" aria-hidden="true">{status}</span>}
    </>
  );
}
