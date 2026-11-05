import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { followChannelsWithCodes } from '@/lib/youtube-channel-read';

// Suit d'un coup les chaînes YouTube des créateurs qui ont au moins un code (les chaînes en pause le restent).
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await followChannelsWithCodes(getDb())) });
  } catch (error) {
    console.error('follow channels failed', error);
    return NextResponse.json({ error: 'Impossible de suivre les chaînes pour le moment.' }, { status: 500 });
  }
}
