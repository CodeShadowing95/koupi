// Lance l'analyse d'un code : lecture de la source, contrôles automatiques, score, puis IA si elle est active.
// Le résultat est gardé dans verification_checks ; l'admin décide ensuite dans la page Vérifications.
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, type VerificationCheckRow, type VerificationReason } from '@/db/schema';
import { aiStatusOf, extractCodes, needsSecondReading, type AiConfig, type Extraction } from './ai-extract';
import { aiSpendSince, recordVerificationCheck, startOfMonthUtc } from './verification-store';
import { findCodeInText, scoreVerification, spamSignals } from './verification';

export type SourceRead = { online: boolean; title: string; description: string };
/** Lit le texte d'une source. null : source impossible à lire (plateforme non prise en charge, clé absente). */
export type SourceReader = (url: string) => Promise<SourceRead | null>;
type CreateMessage = Parameters<typeof extractCodes>[0];

export type RunMode = 'standard' | 'review';
export type RunDeps = { readSource: SourceReader; ai?: { config: AiConfig; create: CreateMessage | null } };

export function youtubeVideoId(url: string): string | null {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  const host = parsed.hostname.toLowerCase().replace(/^www\.|^m\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = parsed.pathname.slice(1).split('/')[0] || null;
  else if (host === 'youtube.com') {
    if (parsed.pathname === '/watch') id = parsed.searchParams.get('v');
    else {
      const match = parsed.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/);
      id = match ? match[1] : null;
    }
  }
  return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
}

// Lecteur YouTube par l'API officielle (1 unité de quota par vidéo). Sans clé, aucune source n'est lue.
export function youtubeReader(apiKey: string | undefined, fetchFn: typeof fetch = fetch): SourceReader {
  return async url => {
    const id = youtubeVideoId(url);
    if (!id || !apiKey) return null;
    const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(id)}&key=${encodeURIComponent(apiKey)}`;
    const response = await fetchFn(endpoint, { cache: 'no-store' });
    if (!response.ok) return null;
    const body = await response.json() as { items?: { snippet?: { title?: string; description?: string } }[] };
    const snippet = body.items?.[0]?.snippet;
    if (!snippet) return { online: false, title: '', description: '' };
    return { online: true, title: snippet.title ?? '', description: snippet.description ?? '' };
  };
}

type AiOutcome = { extraction: Extraction | null; calls: { model: string; costUsdMicros: number; codes: string[]; refused: boolean }[]; note: VerificationReason | null };

async function runAi(db: Db, deps: RunDeps, mode: RunMode, source: SourceRead, score: number): Promise<AiOutcome> {
  const empty: AiOutcome = { extraction: null, calls: [], note: null };
  if (!deps.ai) return empty;
  const { config, create } = deps.ai;
  const since = startOfMonthUtc();
  const status = aiStatusOf(config, await aiSpendSince(db, since));
  if (status.state !== 'active' || !create) return { ...empty, note: { points: 0, label: `${status.label} : pas de lecture par l’IA.` } };

  const calls: AiOutcome['calls'] = [];
  const read = async (model: string) => {
    const extraction = await extractCodes(create, model, source);
    calls.push({ model: extraction.model, costUsdMicros: extraction.costUsdMicros, codes: extraction.codes.map(c => c.code), refused: extraction.refused });
    return extraction;
  };
  let extraction = await read(mode === 'review' ? config.reviewModel : config.model);
  if (mode === 'standard' && needsSecondReading({ extraction, description: source.description, score })) {
    const spent = await aiSpendSince(db, since) + calls.reduce((sum, call) => sum + call.costUsdMicros, 0);
    if (aiStatusOf(config, spent).state === 'active') extraction = await read(config.reviewModel);
  }
  return { extraction, calls, note: null };
}

/** Analyse un code et enregistre le résultat. null si le code n'existe pas. */
export async function runVerification(db: Db, codeId: string, deps: RunDeps, mode: RunMode = 'standard'): Promise<VerificationCheckRow | null> {
  const [code] = await db.select().from(codes).where(eq(codes.id, codeId)).limit(1);
  if (!code) return null;

  const [duplicate] = await db.select({ id: codes.id }).from(codes)
    .where(and(eq(codes.toolId, code.toolId), ne(codes.id, code.id), isNull(codes.archivedAt), sql`lower(${codes.code}) = lower(${code.code})`))
    .limit(1);

  let source: SourceRead | null = null;
  try { source = await deps.readSource(code.sourceUrl); } catch { source = null; }
  const match = source?.online ? findCodeInText(code.code, source.description) : null;

  const result = scoreVerification({
    sourceOnline: source ? source.online : null,
    codeInSource: match ? match.found : null,
    // Les niveaux de créateur viendront avec la table des comptes créateurs (PR 9) : un créateur en base est « repéré ».
    creatorLevel: 'spotted',
    toolKnown: true,
    duplicate: Boolean(duplicate),
    spam: spamSignals({ sourceUrl: code.sourceUrl, code: code.code }),
    votesUp: code.votesUp,
    votesDown: code.votesDown,
  });

  const reasons = [...result.reasons];
  if (!source) reasons.push({ points: 0, label: 'Cette source ne peut pas encore être lue automatiquement : ouvre-la toi-même.' });
  const ai = source?.online ? await runAi(db, deps, mode, source, result.score) : { extraction: null, calls: [], note: null };
  if (ai.note) reasons.push(ai.note);
  if (ai.extraction) {
    const seen = ai.extraction.codes.some(found => found.code.toLowerCase() === code.code.toLowerCase());
    reasons.push({ points: 0, label: seen ? 'L’IA retrouve ce code dans la description.' : 'L’IA ne retrouve pas ce code dans la description.' });
  }

  const last = ai.calls.at(-1);
  return recordVerificationCheck(db, {
    codeId: code.id,
    score: result.score,
    reasons,
    evidence: match?.excerpt ?? null,
    extracted: ai.extraction ? { codes: ai.extraction.codes, calls: ai.calls } : null,
    model: last?.model ?? null,
    costUsdMicros: ai.calls.reduce((sum, call) => sum + call.costUsdMicros, 0),
  });
}
