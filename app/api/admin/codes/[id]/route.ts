import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-session';
import { revalidateCatalog } from '@/lib/catalog-server';
import { applyCodeAction, isQuickAction, parseCodeInput, updateCode } from '@/lib/codes-admin';
import { readJsonBody } from '@/lib/http';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// { action: 'verify' | 'reject' | 'to_test' | 'pending' | 'archive' | 'restore', note? } : action rapide.
// Sinon, le corps est le formulaire complet du code (modification).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.SESSION_SECRET))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: 'Code invalide.' }, { status: 400 });
  try {
    const parsed = await readJsonBody(request, 10_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const db = getDb();
    if ('action' in parsed.data) {
      if (!isQuickAction(parsed.data.action)) return NextResponse.json({ error: 'Action invalide.' }, { status: 400 });
      const note = typeof parsed.data.note === 'string' ? parsed.data.note.trim().slice(0, 1000) || null : null;
      const result = await applyCodeAction(db, id, parsed.data.action, note);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
      revalidateCatalog();
      return NextResponse.json({ ok: true, ...result.data });
    }
    const input = parseCodeInput(parsed.data);
    if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
    const result = await updateCode(db, id, input.data);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Code introuvable.' ? 404 : 400 });
    revalidateCatalog();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('code update failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer ce changement.' }, { status: 500 });
  }
}
