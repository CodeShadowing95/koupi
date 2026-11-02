import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-session';
import { aiConfigFrom, aiStatusOf } from '@/lib/ai-extract';
import { aiSpendSince, startOfMonthUtc } from '@/lib/verification-store';

// État de l'IA pour l'admin : en attente d'activation, active, ou plafond du mois atteint, avec la dépense du mois.
export async function GET(request: NextRequest) {
  if (!(await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.SESSION_SECRET))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const config = aiConfigFrom(process.env);
    const spent = await aiSpendSince(getDb(), startOfMonthUtc());
    return NextResponse.json({ status: aiStatusOf(config, spent), models: { first: config.model, review: config.reviewModel } });
  } catch (error) {
    console.error('ai status failed', error);
    return NextResponse.json({ error: 'Impossible de lire l’état de l’IA.' }, { status: 500 });
  }
}
