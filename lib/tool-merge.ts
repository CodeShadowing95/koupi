// « Fusionner dans… » sur la fiche d'un outil : deux fiches pour la même marque (ex. « Coupon » créée par erreur
// pour ExpressVPN). Les codes de l'outil en double passent sur le bon outil, puis l'outil en double est archivé
// (on n'efface jamais un outil : l'import des fichiers de data/ le recréerait, et l'archive se restaure).
// Un code que le bon outil a déjà (même code, ou même lien d'offre) n'est pas copié deux fois : il est archivé.
// Pas de transaction (pilote Neon HTTP) : un nouvel essai reprend là où ça s'est arrêté.
import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '@/db';
import { codeLogs, codes, tools, toolSuggestions, youtubeSearches, youtubeSeenVideos } from '@/db/schema';
import { findCatalogDuplicate } from './codes-admin';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export type MergeReport = { into: string; moved: number; duplicates: number };

export async function mergeTool(db: Db, fromId: string, intoId: string, now = new Date()): Promise<Parsed<MergeReport>> {
  if (fromId === intoId) return { ok: false, error: 'Choisis un autre outil que celui-ci.' };
  const [from] = await db.select({ id: tools.id, name: tools.name }).from(tools).where(eq(tools.id, fromId)).limit(1);
  if (!from) return { ok: false, error: 'Outil introuvable.' };
  const [into] = await db.select({ id: tools.id, name: tools.name, archivedAt: tools.archivedAt }).from(tools).where(eq(tools.id, intoId)).limit(1);
  if (!into) return { ok: false, error: 'Choisis un outil du catalogue.' };
  if (into.archivedAt) return { ok: false, error: `${into.name} est archivé : restaure-le d’abord.` };

  const rows = await db.select({ id: codes.id, code: codes.code, creatorLink: codes.creatorLink, status: codes.status, archivedAt: codes.archivedAt })
    .from(codes).where(eq(codes.toolId, fromId));
  let moved = 0;
  let duplicates = 0;
  for (const row of rows) {
    const duplicate = await findCatalogDuplicate(db, intoId, row.code ?? '', undefined, row.creatorLink);
    // Déjà sur le bon outil : on garde celui-là, le double reste sur l'outil archivé (archivé lui aussi).
    if (duplicate) {
      duplicates++;
      if (!row.archivedAt) {
        await db.update(codes).set({ archivedAt: now, updatedAt: now }).where(eq(codes.id, row.id));
        await db.insert(codeLogs).values({ codeId: row.id, action: 'archive', previousStatus: row.status, nextStatus: row.status, note: `Fusion de ${from.name} dans ${into.name} : ce code y était déjà.` });
      }
      continue;
    }
    await db.update(codes).set({ toolId: intoId, updatedAt: now }).where(eq(codes.id, row.id));
    await db.insert(codeLogs).values({ codeId: row.id, action: 'edit', previousStatus: row.status, nextStatus: row.status, note: `Rattaché par fusion d’outils : ${from.name} → ${into.name}.` });
    moved++;
  }

  // Le reste du suivi de l'outil suit : propositions, recherches YouTube et vidéos déjà lues.
  await db.update(toolSuggestions).set({ toolId: intoId }).where(eq(toolSuggestions.toolId, fromId));
  await db.update(youtubeSearches).set({ toolId: intoId }).where(eq(youtubeSearches.toolId, fromId));
  await db.update(youtubeSeenVideos).set({ toolId: intoId }).where(eq(youtubeSeenVideos.toolId, fromId));
  await db.update(tools).set({ archivedAt: now, updatedAt: now }).where(and(eq(tools.id, fromId), isNull(tools.archivedAt)));
  return { ok: true, data: { into: into.name, moved, duplicates } };
}
