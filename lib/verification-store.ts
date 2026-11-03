import { desc, eq, gte, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { toolSuggestions, verificationChecks, type VerificationCheckRow, type VerificationReason } from '@/db/schema';

export type CheckInput = {
  codeId?: string | null;
  submissionId?: string | null;
  score: number;
  reasons: VerificationReason[];
  evidence?: string | null;
  extracted?: Record<string, unknown> | null;
  model?: string | null;
  costUsdMicros?: number;
};

// Enregistre une analyse. Le score est borné à 0–100 et le coût ne peut pas être négatif.
export async function recordVerificationCheck(db: Db, input: CheckInput): Promise<VerificationCheckRow> {
  if (!input.codeId && !input.submissionId) throw new Error('Une analyse vise un code ou une proposition.');
  const [row] = await db.insert(verificationChecks).values({
    codeId: input.codeId ?? null,
    submissionId: input.submissionId ?? null,
    score: Math.max(0, Math.min(100, Math.round(input.score))),
    reasons: input.reasons,
    evidence: input.evidence ?? null,
    extracted: input.extracted ?? null,
    model: input.model ?? null,
    costUsdMicros: Math.max(0, Math.round(input.costUsdMicros ?? 0)),
  }).returning();
  return row;
}

// Dernière analyse d'un code, pour l'afficher dans la file de vérification.
export async function latestCheckForCode(db: Db, codeId: string): Promise<VerificationCheckRow | null> {
  const [row] = await db.select().from(verificationChecks)
    .where(eq(verificationChecks.codeId, codeId))
    .orderBy(desc(verificationChecks.createdAt)).limit(1);
  return row ?? null;
}

/** Premier jour du mois en cours, en UTC. */
export function startOfMonthUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// Dépense IA depuis une date, en millionièmes de dollar : sert au plafond mensuel.
/** Dépense de l'IA depuis une date : analyses des codes, plus analyses des outils à ajouter (ADR-0024). */
export async function aiSpendSince(db: Db, since: Date): Promise<number> {
  const [checks] = await db.select({ total: sql<string>`coalesce(sum(${verificationChecks.costUsdMicros}), 0)` })
    .from(verificationChecks)
    .where(gte(verificationChecks.createdAt, since));
  const [tools] = await db.select({ total: sql<string>`coalesce(sum(${toolSuggestions.analysisCostUsdMicros}), 0)` })
    .from(toolSuggestions)
    .where(gte(toolSuggestions.analyzedAt, since));
  return Number(checks?.total ?? 0) + Number(tools?.total ?? 0);
}
