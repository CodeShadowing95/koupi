// Formulaire « Proposer un code » : le visiteur colle le lien d'une vidéo YouTube, Merkod lit la vidéo
// par l'API officielle (1 unité de quota) et pré-remplit le bon : le nom exact de la chaîne, et les codes
// trouvés dans la description avec leur outil et leur réduction. Même repérage que les podcasts, sans IA :
// le visiteur coche et corrige, puis l'admin vérifie chaque proposition comme d'habitude.
import { isNull } from 'drizzle-orm';
import type { Db } from '@/db';
import { tools } from '@/db/schema';
import type { FoundVideo, YoutubeSearch } from './category-code-search';
import { domainOf, scanPromoCodes, type CatalogTool } from './podcast-codes';
import { youtubeVideoId } from './verification-run';

/** Un code trouvé dans la description. known : l'outil est déjà suivi par Merkod. */
export type PrefillCode = { tool: string; code: string; discount: string; known: boolean };
export type Prefill = { creator: string; title: string; codes: PrefillCode[] };

/** Au plus 8 codes proposés : une description qui en donne davantage est rare, et le formulaire resterait lisible. */
export const MAX_PREFILL_CODES = 8;
/** Libellé du repérage quand aucune réduction n'est écrite : le formulaire laisse alors la pastille vide. */
const NO_DISCOUNT = 'Voir l’épisode';

/** Ce que la vidéo dit : la chaîne telle que YouTube l'écrit, et les codes de sa description. */
export function prefillFrom(video: Pick<FoundVideo, 'title' | 'description' | 'channelTitle'>, catalog: CatalogTool[]): Prefill {
  const nameOf = new Map(catalog.map(tool => [tool.id, tool.name]));
  const { found, unknown } = scanPromoCodes(`${video.title}\n${video.description}`, catalog);
  const discount = (value: string) => (value === NO_DISCOUNT ? '' : value);
  const codes: PrefillCode[] = [
    ...found.map(item => ({ tool: nameOf.get(item.toolId) ?? '', code: item.code, discount: discount(item.discount), known: true })),
    ...unknown.map(item => ({ tool: item.name, code: item.code, discount: discount(item.discount), known: false })),
  ].filter(item => item.tool);
  return { creator: video.channelTitle.trim(), title: video.title.trim(), codes: codes.slice(0, MAX_PREFILL_CODES) };
}

/** Les outils suivis (archivés exclus), pour reconnaître leur nom ou leur site dans la description. */
export async function prefillTools(db: Db): Promise<CatalogTool[]> {
  const rows = await db.select({ id: tools.id, name: tools.name, website: tools.website }).from(tools).where(isNull(tools.archivedAt));
  return rows.map(tool => ({ id: tool.id, name: tool.name, domain: domainOf(tool.website) }));
}

/** Lit la vidéo du lien. null si le lien n'est pas une vidéo YouTube ou si la vidéo n'existe pas (privée, supprimée). */
export async function readVideoPrefill(url: string, youtube: Pick<YoutubeSearch, 'videos'>, catalog: CatalogTool[]): Promise<Prefill | null> {
  const id = youtubeVideoId(url);
  if (!id) return null;
  const [video] = await youtube.videos([id]);
  return video ? prefillFrom(video, catalog) : null;
}
