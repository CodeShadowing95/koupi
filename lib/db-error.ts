// Message d'erreur lisible pour l'admin, sans jamais montrer la requête SQL ni ses paramètres.
// Drizzle enveloppe l'erreur de Postgres (« Failed query: insert into … params: … ») : la vraie cause est dans error.cause.

type PgLike = { code?: unknown; constraint?: unknown; message?: unknown; cause?: unknown };

const CONSTRAINTS: Record<string, string> = {
  codes_code_len: 'un code trouvé est vide ou trop long (120 caractères au plus)',
  codes_discount_len: 'la réduction d’un code trouvé est vide ou trop longue (240 caractères au plus)',
  codes_source_url_http: 'le lien de la source d’un code ne commence pas par http',
  codes_origin_valid: 'l’origine d’un code n’est pas reconnue',
};

function pgCause(error: unknown): PgLike | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth++) {
    const candidate = current as PgLike;
    if (typeof candidate.code === 'string' && /^[0-9A-Z]{5}$/.test(candidate.code)) return candidate;
    current = candidate.cause;
  }
  return null;
}

const isQueryText = (text: string) => /^Failed query:/i.test(text) || /\bparams:/.test(text) && /\b(insert into|update|select|delete from)\b/i.test(text);

/** Phrase en français qui dit ce qui a échoué, pour le journal des passages. */
export function readableError(error: unknown): string {
  const pg = pgCause(error);
  if (pg) {
    const constraint = typeof pg.constraint === 'string' ? pg.constraint : null;
    if (pg.code === '23514') return `La base a refusé d’enregistrer : ${constraint && CONSTRAINTS[constraint] ? CONSTRAINTS[constraint] : `règle ${constraint ?? 'inconnue'} non respectée`}.`;
    if (pg.code === '23505') return `La base a refusé un doublon${constraint ? ` (${constraint})` : ''}.`;
    if (pg.code === '23503') return `La base a refusé un lien vers une ligne qui n’existe pas${constraint ? ` (${constraint})` : ''}.`;
    if (pg.code === '57014') return 'La base a mis trop de temps à répondre.';
    return `Erreur de la base (code ${pg.code}).`;
  }
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : '';
  if (isQueryText(message)) {
    if (/fetch failed|ECONNRESET|ETIMEDOUT|network|socket/i.test(cause)) return 'La base de données ne répond pas. Réessaie dans un moment.';
    return 'Erreur de la base de données pendant l’enregistrement. Le détail est dans les journaux Vercel.';
  }
  return message.slice(0, 500);
}

/** Erreur déjà enregistrée au journal : masque la requête SQL des passages notés avant ce correctif. */
export function readableRunError(text: string | null): string | null {
  if (!text) return text;
  return isQueryText(text) ? 'Erreur de la base de données pendant l’enregistrement. Le détail est dans les journaux Vercel.' : text;
}
