import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-session';
import { readJsonBody } from '@/lib/http';
import { isStatusFilter, listSubmissions, moderateSubmission, moderationActions, type ModerationAction } from '@/lib/submissions';

function authorized(request: NextRequest): Promise<boolean> { return verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.SESSION_SECRET); }
function validDate(value: string | null): boolean { return !value || /^\d{4}-\d{2}-\d{2}$/.test(value); }
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const params = request.nextUrl.searchParams;
    const from = params.get('from');
    const to = params.get('to');
    const status = params.get('status') || 'new';
    if (!validDate(from) || !validDate(to)) return NextResponse.json({ error: 'Format de date invalide.' }, { status: 400 });
    if (!isStatusFilter(status)) return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
    const rows = await listSubmissions(getDb(), { status, category: params.get('category') || '', from, to });
    // Le back-office lit les champs en snake_case.
    const submissions = rows.map(row => ({
      id: row.id, tool_name: row.toolName, creator_name: row.creatorName, category: row.category, code: row.code,
      discount_label: row.discountLabel, source_url: row.sourceUrl, creator_link: row.creatorLink, comment: row.comment,
      submitter_email: row.submitterEmail, status: row.status, admin_note: row.adminNote, created_at: row.createdAt.toISOString(),
    }));
    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('submissions read failed', error);
    return NextResponse.json({ error: 'Impossible de charger la file de modération.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const parsed = await readJsonBody(request, 4_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const body = parsed.data as { id?: unknown; action?: unknown; note?: unknown };
    if (typeof body.id !== 'string' || !uuidPattern.test(body.id) || !moderationActions.includes(body.action as ModerationAction)) return NextResponse.json({ error: 'Action invalide.' }, { status: 400 });
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) || null : null;
    const status = await moderateSubmission(getDb(), body.id, body.action as ModerationAction, note);
    if (!status) return NextResponse.json({ error: 'Proposition introuvable.' }, { status: 404 });
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    console.error('submission moderation failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer cette décision.' }, { status: 500 });
  }
}
