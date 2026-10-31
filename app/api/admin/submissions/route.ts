import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
function authorized(request: NextRequest): boolean { return request.cookies.get('koupi_admin')?.value === 'authenticated'; }
function validDate(value: string | null): boolean { return !value || /^\d{4}-\d{2}-\d{2}$/.test(value); }
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const status = request.nextUrl.searchParams.get('status') || 'new';
    const category = request.nextUrl.searchParams.get('category') || '';
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');
    if (!validDate(from) || !validDate(to)) return NextResponse.json({ error: 'Format de date invalide.' }, { status: 400 });
    const client = getAdminClient();
    let query = client.from('submissions').select('*').order('created_at', { ascending: false }).limit(100);
    if (status !== 'all') query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`);
    if (to) { const end = new Date(`${to}T00:00:00.000Z`); end.setUTCDate(end.getUTCDate() + 1); query = query.lt('created_at', end.toISOString()); }
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ submissions: data || [] });
  } catch (error) { console.error('submissions read failed', error); return NextResponse.json({ error: 'Impossible de charger la file de modération.' }, { status: 500 }); }
}
export async function PATCH(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const body = await request.json() as { id?: string; action?: string; note?: string };
    if (!body.id || !['approve', 'reject', 'mark_duplicate', 'restore'].includes(body.action || '')) return NextResponse.json({ error: 'Action invalide.' }, { status: 400 });
    const client = getAdminClient();
    const { data: current, error: readError } = await client.from('submissions').select('id,status').eq('id', body.id).maybeSingle();
    if (readError || !current) return NextResponse.json({ error: 'Proposition introuvable.' }, { status: 404 });
    const nextStatus = body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : body.action === 'mark_duplicate' ? 'duplicate' : 'new';
    const note = body.note?.trim().slice(0, 1000) || null;
    const { error: updateError } = await client.from('submissions').update({ status: nextStatus, admin_note: note, reviewed_at: new Date().toISOString() }).eq('id', body.id);
    if (updateError) throw updateError;
    const { error: logError } = await client.from('moderation_logs').insert({ submission_id: body.id, action: body.action, previous_status: current.status, next_status: nextStatus, note });
    if (logError) throw logError;
    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) { console.error('submission moderation failed', error); return NextResponse.json({ error: 'Impossible d’enregistrer cette décision.' }, { status: 500 }); }
}
