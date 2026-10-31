// Lecture d'un corps JSON avec une taille maximale, pour éviter de charger en mémoire des requêtes énormes.
export type JsonBody = { ok: true; data: Record<string, unknown> } | { ok: false; status: 400 | 413 };

export async function readJsonBody(request: Request, maxBytes: number): Promise<JsonBody> {
  const announced = Number(request.headers.get('content-length'));
  if (Number.isFinite(announced) && announced > maxBytes) return { ok: false, status: 413 };
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, status: 413 };
  try {
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, status: 400 };
    return { ok: true, data: data as Record<string, unknown> };
  } catch {
    return { ok: false, status: 400 };
  }
}
