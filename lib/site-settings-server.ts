// État du site lu par les pages publiques et le middleware : mis en cache, rafraîchi dès que l'admin change un interrupteur.
// Si la base ne répond pas, le site reste ouvert (toutes les pages en ligne, pas de maintenance) plutôt que de tomber.
import { revalidateTag, unstable_cache } from 'next/cache';
import { connection } from 'next/server';
import { getDb } from '@/db';
import { DEFAULT_SITE_STATE, type SiteState } from './site-pages';
import { loadSiteState } from './site-settings';

export const SITE_STATE_TAG = 'site-state';

const cached = unstable_cache(async (): Promise<SiteState> => {
  const { off, maintenance } = await loadSiteState(getDb());
  return { off, maintenance };
  // Un jour : l'état ne change que par l'admin, qui vide ce cache aussitôt (revalidateSiteState). Relire la base chaque
  // minute la gardait éveillée jour et nuit et épuisait les heures de calcul du plan gratuit de Neon (ADR-0051).
}, ['site-state-v1'], { tags: [SITE_STATE_TAG], revalidate: 86_400 });

export async function getSiteState(): Promise<SiteState> {
  // Rendu à la demande : une page figée au build garderait des liens vers une page coupée depuis.
  await connection();
  try {
    return await cached();
  } catch (error) {
    console.error('site state unavailable', error);
    return DEFAULT_SITE_STATE;
  }
}

export function revalidateSiteState() {
  revalidateTag(SITE_STATE_TAG);
}
