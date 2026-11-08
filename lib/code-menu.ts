// Menu « ⋮ » d'un coupon détaillé : ce qu'on peut faire d'un code en plus de le copier et de voter.
import { routes } from './routes';
import { sourceAction } from './source-label';

export type CodeMenuKey = 'source' | 'tool' | 'creator' | 'share' | 'report';
export type CodeMenuItem = { key: CodeMenuKey; label: string; href?: string; external?: boolean };

type MenuCode = { source: string; toolSlug: string; creatorSlug: string; tool: string; creator: string };

/** Les choix du menu, dans l'ordre. Les liens absents (pas de source, pas de fiche) ne sont pas proposés. */
export function codeMenuItems(code: MenuCode, platform: string | null | undefined, options: { linkTool?: boolean } = {}): CodeMenuItem[] {
  const items: CodeMenuItem[] = [];
  if (code.source) items.push({ key: 'source', label: sourceAction(platform), href: code.source, external: true });
  if (code.toolSlug && options.linkTool !== false) items.push({ key: 'tool', label: `Tous les codes ${code.tool}`, href: routes.tool(code.toolSlug) });
  if (code.creatorSlug) items.push({ key: 'creator', label: `Page de ${code.creator}`, href: routes.creator(code.creatorSlug) });
  if (code.toolSlug) items.push({ key: 'share', label: 'Partager' });
  items.push({ key: 'report', label: 'Signaler un problème', href: reportHref(code.toolSlug) });
  return items;
}

/** Le formulaire « Ton avis », prérempli avec la page du code signalé. */
export function reportHref(toolSlug: string): string {
  return toolSlug ? `${routes.feedback}?from=${encodeURIComponent(routes.tool(toolSlug))}` : routes.feedback;
}
