import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-session';
import { runRetests } from '@/lib/retest';
import { verificationDeps } from '@/lib/verification-deps';

export const maxDuration = 300;

// Lance les retests à la main depuis l'admin (même travail que la tâche de nuit), utile en pré-production
// où Vercel ne lance pas les tâches planifiées.
export async function POST(request: NextRequest) {
  if (!(await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.SESSION_SECRET))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const report = await runRetests(getDb(), verificationDeps());
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    console.error('manual retest failed', error);
    return NextResponse.json({ error: 'Retests impossibles pour le moment.' }, { status: 500 });
  }
}
