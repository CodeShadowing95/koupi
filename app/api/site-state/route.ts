import { NextResponse } from 'next/server';
import { getSiteState } from '@/lib/site-settings-server';

// État du site (pages coupées, maintenance) lu par le middleware (ADR-0051). La réponse vient du cache de Next,
// vidé quand l'admin change un interrupteur : le middleware ne touche plus la base à chaque visite.
// Rien de secret : c'est ce que le site montre déjà (une page coupée répond 404 à tout le monde).
export async function GET() {
  const { off, maintenance } = await getSiteState();
  return NextResponse.json({ off, maintenance }, { headers: { 'Cache-Control': 'no-store' } });
}
