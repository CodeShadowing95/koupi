import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { sendLinkInvite } from '@/lib/creator-merge';
import { mailerFromEnv } from '@/lib/creator-mail';
import { routes } from '@/lib/routes';

// Pages à relier (ADR-0044) : l'admin envoie d'un clic l'invitation à relier sa vraie page. Jamais d'envoi automatique.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Créateur invalide.' }, { status: 400 });
  const mailer = mailerFromEnv();
  if (!mailer) return NextResponse.json({ error: 'L’envoi d’e-mails n’est pas configuré (RESEND_API_KEY, EMAIL_FROM).' }, { status: 503 });
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/+$/, '');
  try {
    const result = await sendLinkInvite(getDb(), id, mailer, `${appUrl}${routes.creatorSpace}`);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('link invite failed', error);
    return NextResponse.json({ error: 'Impossible d’envoyer l’invitation. Réessaie dans un instant.' }, { status: 502 });
  }
}
