import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-session';
import { revalidateCatalog } from '@/lib/catalog-server';
import { createCode, parseCodeInput } from '@/lib/codes-admin';
import { readJsonBody } from '@/lib/http';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Nouveau code saisi dans l'admin, ou proposition validée (submissionId) qui devient un code.
export async function POST(request: NextRequest) {
  if (!(await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.SESSION_SECRET))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const parsed = await readJsonBody(request, 10_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const input = parseCodeInput(parsed.data);
    if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
    const submissionId = parsed.data.submissionId;
    if (submissionId !== undefined && (typeof submissionId !== 'string' || !uuidPattern.test(submissionId))) return NextResponse.json({ error: 'Proposition invalide.' }, { status: 400 });
    const result = await createCode(getDb(), input.data, { submissionId: submissionId as string | undefined });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    revalidateCatalog();
    return NextResponse.json({ ok: true, id: result.data.id });
  } catch (error) {
    console.error('code create failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer ce code.' }, { status: 500 });
  }
}
