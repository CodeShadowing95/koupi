import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-session';
import { readJsonBody } from '@/lib/http';
import { runVerification } from '@/lib/verification-run';
import { verificationDeps } from '@/lib/verification-deps';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// { mode?: 'standard' | 'review' } : analyse un code (source, contrôles, score, IA si active).
// 'review' fait relire directement par le modèle puissant (bouton « Relire avec Opus »).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.SESSION_SECRET))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: 'Code invalide.' }, { status: 400 });
  const parsed = await readJsonBody(request, 1_000);
  if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
  const mode = parsed.data.mode === 'review' ? 'review' : 'standard';
  try {
    const check = await runVerification(getDb(), id, verificationDeps(), mode);
    if (!check) return NextResponse.json({ error: 'Code introuvable.' }, { status: 404 });
    return NextResponse.json({ ok: true, check });
  } catch (error) {
    console.error('verification failed', error);
    return NextResponse.json({ error: 'Impossible d’analyser ce code pour le moment.' }, { status: 500 });
  }
}
