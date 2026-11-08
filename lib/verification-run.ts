// Lance l'analyse d'un code : lecture de la source, contrôles automatiques, score, puis IA si elle est active.
// Le résultat est gardé dans verification_checks ; l'admin décide ensuite dans la page Vérifications.
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, toolSuggestions, tools, type CodeRow, type VerificationCheckRow, type VerificationReason } from '@/db/schema';
import { aiStatusOf, extractCodes, needsSecondReading, type AiConfig, type ExtractedCode, type Extraction } from './ai-extract';
import { isValidDay } from './code-expiry';
import { creatorLevelFor } from './creator-level';
import { aiSpendSince, recordVerificationCheck, startOfMonthUtc } from './verification-store';
import { AI_MISS_POINTS, CLEAR_SCORE, clip, findCodeInText, implausibleCode, scoreVerification, sourceKindOf, spamSignals } from './verification';
import { domainOf, scanPromoCodes } from './podcast-codes';
import { forVideo, mergeAiCodes } from './podcast-ai';
import { addPendingCode } from './podcast-read';
import { suggestionOrigin, type CodeOrigin } from './code-origin';
import { youtubeFetch } from './api-usage';
import { findLinkInText, isLinkOffer, offerName, shortLink } from './offer-link';
import { offerLinksEnabled } from './site-settings';
import { isCompilationNote } from './compilation-note';

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
export function youtubeReader(apiKey: string | undefined, fetchFn: typeof fetch = youtubeFetch): SourceReader {
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

async function runAi(db: Db, deps: RunDeps, mode: RunMode, source: SourceRead, score: number, links: boolean): Promise<AiOutcome> {
  const empty: AiOutcome = { extraction: null, calls: [], note: null };
  if (!deps.ai) return empty;
  const { config, create } = deps.ai;
  const since = startOfMonthUtc();
  const status = aiStatusOf(config, await aiSpendSince(db, since));
  if (status.state !== 'active' || !create) return { ...empty, note: { points: 0, label: `${status.label} : pas de lecture par l’IA.` } };

  const calls: AiOutcome['calls'] = [];
  const read = async (model: string) => {
    const extraction = await extractCodes(create, model, source, { links });
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

const AUTO_ORIGINS: CodeOrigin[] = ['youtube_search', 'youtube_channel', 'podcast'];

/**
 * Les autres codes que donne la même source (« Aferiy : solarflowtech6 » à côté du code analysé) : ceux des outils du
 * catalogue sont ajoutés en attente, les autres vont dans les outils à ajouter. Rien n'est publié : l'admin décide.
 * Un autre code pour le même outil n'est pas ajouté : c'est sans doute le bon code, à reprendre avec le crayon.
 */
export async function addSiblingCodes(db: Db, code: CodeRow, source: SourceRead, aiCodes: ExtractedCode[]): Promise<{ added: string[]; suggested: string[] }> {
  const catalog = (await db.select({ id: tools.id, name: tools.name, website: tools.website }).from(tools).where(isNull(tools.archivedAt)))
    .map(tool => ({ id: tool.id, name: tool.name, domain: domainOf(tool.website) }));
  const toolName = new Map(catalog.map(tool => [tool.id, tool.name]));
  const merged = mergeAiCodes(scanPromoCodes(`${source.title}\n${source.description}`, catalog), aiCodes, catalog);
  const video = sourceKindOf(code.sourceUrl) === 'youtube';
  const found = video ? forVideo(merged.found) : merged.found;
  const unknown = video ? forVideo(merged.unknown) : merged.unknown;
  // Le code analysé lui-même : même code, ou même lien pour une offre sans code.
  const same = (item: { code: string; link?: string }) => item.code
    ? item.code.trim().toLowerCase() === (code.code ?? '').trim().toLowerCase()
    : Boolean(code.creatorLink && item.link && shortLink(item.link) === shortLink(code.creatorLink));
  const name = offerName(code.code, code.creatorLink);
  const origin = AUTO_ORIGINS.includes(code.origin as CodeOrigin) ? code.origin as CodeOrigin : suggestionOrigin(code.sourceUrl);
  const added: string[] = [];
  const suggested: string[] = [];
  for (const item of found) {
    if (item.toolId === code.toolId || same(item)) continue;
    const id = await addPendingCode(db, {
      toolId: item.toolId, creatorId: code.creatorId, code: item.code, link: item.link, discount: item.discount, sourceUrl: code.sourceUrl, sourceTitle: code.sourceTitle,
      note: `Trouvé dans la même source que ${name} : « ${item.evidence} »`, expiresOn: item.expiresOn, origin,
    }, `Analyse de ${name}`);
    if (id) added.push(`${item.code || 'une offre par lien'} (${toolName.get(item.toolId) ?? 'outil'})`);
  }
  for (const item of unknown) {
    if (same(item)) continue;
    const inserted = await db.insert(toolSuggestions).values({
      name: clip(item.name, 120), domain: item.domain, code: item.code || null, link: item.link || null, discount: item.discount, evidence: item.evidence,
      sourceUrl: code.sourceUrl, sourceTitle: clip(code.sourceTitle, 300), creatorId: code.creatorId,
    }).onConflictDoNothing().returning({ id: toolSuggestions.id });
    if (inserted.length) suggested.push(`${item.code || 'une offre par lien'} (${item.domain ?? item.name})`);
  }
  return { added, suggested };
}

/** Analyse un code et enregistre le résultat. null si le code n'existe pas. */
export async function runVerification(db: Db, codeId: string, deps: RunDeps, mode: RunMode = 'standard'): Promise<VerificationCheckRow | null> {
  const [code] = await db.select().from(codes).where(eq(codes.id, codeId)).limit(1);
  if (!code) return null;

  // Offre par lien (sans code, ADR-0040) : c'est le lien qui la nomme, pour les doublons comme pour la preuve.
  const linkOffer = isLinkOffer(code) && Boolean(code.creatorLink);
  const [duplicate] = await db.select({ id: codes.id }).from(codes)
    .where(and(eq(codes.toolId, code.toolId), ne(codes.id, code.id), isNull(codes.archivedAt), linkOffer
      ? and(isNull(codes.code), sql`lower(${codes.creatorLink}) = lower(${code.creatorLink})`)
      : sql`lower(${codes.code}) = lower(${code.code})`))
    .limit(1);

  const [tool] = await db.select({ name: tools.name }).from(tools).where(eq(tools.id, code.toolId)).limit(1);

  let source: SourceRead | null = null;
  try { source = await deps.readSource(code.sourceUrl); } catch { source = null; }
  const match = !source?.online ? null : linkOffer ? findLinkInText(code.creatorLink ?? '', source.description) : findCodeInText(code.code ?? '', source.description);

  const result = scoreVerification({
    sourceOnline: source ? source.online : null,
    codeInSource: match ? match.found : null,
    creatorLevel: await creatorLevelFor(db, code.creatorId),
    toolKnown: true,
    duplicate: Boolean(duplicate),
    spam: spamSignals({ sourceUrl: code.sourceUrl, code: code.code ?? '' }),
    implausible: linkOffer ? null : implausibleCode(code.code ?? '', tool?.name),
    votesUp: code.votesUp,
    votesDown: code.votesDown,
  });

  const reasons = [...result.reasons];
  let score = result.score;
  if (!source) reasons.push({ points: 0, label: 'Cette source ne peut pas encore être lue automatiquement : ouvre-la toi-même.' });
  // Option « Liens d'affiliation » coupée : l'IA ne relève que des codes. Une offre par lien déjà enregistrée
  // se vérifie quand même par son lien, mais rien de nouveau n'est tiré des liens (ni lien ajouté, ni offre voisine par lien).
  const linksOn = await offerLinksEnabled(db);
  const ai = source?.online ? await runAi(db, deps, mode, source, result.score, linksOn || linkOffer) : { extraction: null, calls: [], note: null };
  if (ai.note) reasons.push(ai.note);
  if (linkOffer && match) reasons.push({ points: 0, label: match.found ? 'Offre par lien : le lien est bien dans la source.' : 'Offre par lien : le lien n’est pas dans la source.' });
  if (ai.extraction) {
    // Une offre sans code se retrouve par son lien (ADR-0040).
    const seen = linkOffer
      ? ai.extraction.codes.find(found => found.link && shortLink(found.link) === shortLink(code.creatorLink ?? ''))
      : ai.extraction.codes.find(found => found.code.toLowerCase() === (code.code ?? '').toLowerCase());
    // L'IA lit la phrase entière : quand elle ne voit pas de code là où notre repérage en voit un (« 2026 », un mot du titre),
    // le dossier n'est plus clair. Le score reste calculé ici, l'IA ne fait que retirer des points.
    if (seen) reasons.push({ points: 0, label: linkOffer ? 'L’IA retrouve cette offre et son lien dans la description.' : 'L’IA retrouve ce code dans la description.' });
    else {
      // Elle lit souvent le vrai code à côté (« LWS » repéré, « CQ410 » écrit) : on le montre pour que l'admin corrige.
      const others = [...new Set(ai.extraction.codes.map(found => found.code.trim()).filter(Boolean))].slice(0, 3);
      const what = linkOffer ? 'cette offre' : 'ce code';
      // Quand l'IA ne voit pas le code, le dossier n'est jamais « clair » : il passe au moins « À regarder de près ».
      const next = Math.max(0, Math.min(score + AI_MISS_POINTS, CLEAR_SCORE - 1));
      reasons.push({ points: next - score, label: others.length ? `L’IA ne retrouve pas ${what} dans la description. Elle y lit plutôt : ${others.join(', ')}.` : `L’IA ne retrouve pas ${what} dans la description.` });
      score = next;
    }
    // Lien de l'offre écrit à côté du code : l'IA pré-remplit le champ s'il est vide. L'admin peut le corriger.
    if (linksOn && seen?.link && !code.creatorLink) {
      await db.update(codes).set({ creatorLink: seen.link, updatedAt: new Date() }).where(eq(codes.id, code.id));
      reasons.push({ points: 0, label: `L’IA a trouvé le lien de l’offre (${shortLink(seen.link)}) et l’a ajouté au code.` });
    }
    // Date de fin écrite par le créateur : l'IA pré-remplit le champ s'il est vide. L'admin peut la corriger.
    if (seen?.expiresOn && !code.expiresOn && isValidDay(seen.expiresOn)) {
      await db.update(codes).set({ expiresOn: seen.expiresOn, updatedAt: new Date() }).where(eq(codes.id, code.id));
      reasons.push({ points: 0, label: `L’IA a trouvé une date de fin (${seen.expiresOn}) et l’a ajoutée au code.` });
    }
  }

  // Code repris d'une compilation (ADR-0042) : la vidéo est celle d'une autre chaîne, elle ne prouve pas que le créateur
  // crédité donne ce code. Le dossier n'est jamais « clair » ; les autres codes de la vidéo ont déjà été relevés par la recherche.
  const compilation = isCompilationNote(code.note);
  if (compilation) {
    const next = Math.min(score, CLEAR_SCORE - 1);
    reasons.push({ points: next - score, label: 'Code repris d’une compilation d’une autre chaîne : vérifie-le chez le créateur crédité avant de le valider.' });
    score = next;
  }

  if (source?.online && !compilation) {
    // Une source qui ne s'enregistre pas (texte refusé par la base…) ne doit pas faire échouer l'analyse du code.
    const aiCodes = (ai.extraction?.codes ?? []).filter(found => linksOn || found.code).map(found => (linksOn ? found : { ...found, link: '' }));
    const siblings = await addSiblingCodes(db, code, source, aiCodes).catch(error => { console.error('sibling codes failed', error); return null; });
    if (siblings?.added.length) reasons.push({ points: 0, label: `La source donne aussi ${siblings.added.join(', ')} : ajouté${siblings.added.length > 1 ? 's' : ''} en attente dans Vérifications.` });
    if (siblings?.suggested.length) reasons.push({ points: 0, label: `Codes pour des outils absents du catalogue : ${siblings.suggested.join(', ')}, dans les outils à ajouter.` });
  }

  const last = ai.calls.at(-1);
  return recordVerificationCheck(db, {
    codeId: code.id,
    score,
    reasons,
    evidence: match?.excerpt ?? null,
    extracted: ai.extraction ? { codes: ai.extraction.codes, calls: ai.calls } : null,
    model: last?.model ?? null,
    costUsdMicros: ai.calls.reduce((sum, call) => sum + call.costUsdMicros, 0),
  });
}
