// Nombres du menu de l'admin pour ce qui attend une action : chaque entrée qui reçoit du nouveau (analyse, lecture
// de nuit, recherche) a sa pastille, et l'entrée parente repliée affiche un point. Lus en base par le layout.
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, podcastCandidates, toolSuggestions, watchedSources } from '@/db/schema';

export type NavWaiting = {
  /** Codes « En attente » (trouvés automatiquement ou proposés) qui attendent ta décision dans Vérifications. */
  toDecide?: number;
  /** Codes gardés pour des outils absents du catalogue (Outils à ajouter). */
  toolsToAdd?: number;
  /** Podcasts candidats pas encore regardés ni suivis (Podcasts suivis › Candidats › À examiner). */
  newCandidates?: number;
};

const count = sql<number>`count(*)::int`;

export async function navWaitingCounts(db: Db): Promise<NavWaiting> {
  const [[decide], [tools], [candidates]] = await Promise.all([
    db.select({ n: count }).from(codes).where(and(eq(codes.status, 'pending'), isNull(codes.archivedAt))),
    db.select({ n: count }).from(toolSuggestions).where(eq(toolSuggestions.status, 'open')),
    // Un candidat suivi depuis garde l'état « new » mais n'est plus montré dans l'onglet (listCandidates) : on ne le compte pas.
    db.select({ n: count }).from(podcastCandidates).where(and(eq(podcastCandidates.status, 'new'), sql`not exists (
      select 1 from ${watchedSources} where ${watchedSources.platform} = 'podcast' and ${watchedSources.externalId} = ${podcastCandidates.itunesId})`)),
  ]);
  return { toDecide: decide?.n ?? 0, toolsToAdd: tools?.n ?? 0, newCandidates: candidates?.n ?? 0 };
}
