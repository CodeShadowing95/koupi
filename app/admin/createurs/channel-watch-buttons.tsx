'use client';
// Chaînes YouTube suivies, en haut de la page Créateurs : suivre d'un coup les chaînes des créateurs qui ont un code,
// et lire tout de suite leurs nouvelles vidéos (sinon, la lecture passe chaque nuit).
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { plural } from '@/lib/creator-accounts-display';
import type { ChannelReadReport } from '@/lib/youtube-channel-read';

type Followed = { followed: number; already: number };

export function ChannelWatchButtons({ followed, youtubeReady }: { followed: number; youtubeReady: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'follow' | 'read' | null>(null);
  const [follow, setFollow] = useState<Followed | null>(null);
  const [read, setRead] = useState<ChannelReadReport | null>(null);
  const [error, setError] = useState('');

  async function run(kind: 'follow' | 'read') {
    setBusy(kind);
    setError('');
    setFollow(null);
    setRead(null);
    try {
      const response = await fetch(`/api/admin/youtube-channels/${kind}`, { method: 'POST' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) setError(body.error || 'L’opération a échoué.');
      else if (kind === 'follow') { setFollow(body as Followed); router.refresh(); }
      else { setRead(body as ChannelReadReport); router.refresh(); }
    } catch {
      setError('L’opération a échoué. Vérifie ta connexion.');
    }
    setBusy(null);
  }
  const close = () => { setFollow(null); setRead(null); setError(''); };

  return (
    <>
      <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => run('follow')}
        title="Suit les vidéos des chaînes YouTube reliées des créateurs qui ont au moins un code. Une chaîne mise en pause à la main reste en pause.">
        {busy === 'follow' ? 'Suivi…' : 'Suivre les chaînes'}
      </button>
      <button type="button" className="adm-btn" disabled={busy !== null || followed === 0 || !youtubeReady} onClick={() => run('read')}
        title={!youtubeReady ? 'La clé YouTube manque' : followed === 0 ? 'Aucune chaîne suivie' : `Lit maintenant les nouvelles vidéos des chaînes suivies (environ ${followed} unités du quota). Sinon, c’est fait chaque nuit.`}>
        {busy === 'read' ? 'Lecture…' : `Lire les chaînes suivies${followed ? ` (${followed})` : ''}`}
      </button>
      {(follow || read || error) && (
        <div className="adm-link-report" role="status">
          {error ? <div className="notice notice-error">{error}<button type="button" className="adm-btn" onClick={close}>Fermer</button></div> : (
            <div className="notice">
              {follow && <b>{follow.followed === 0 ? 'Aucune nouvelle chaîne à suivre.' : `${plural(follow.followed, 'chaîne suivie', 'chaînes suivies')} en plus.`}{follow.already > 0 && ` ${plural(follow.already, 'chaîne l’était', 'chaînes l’étaient')} déjà (ou en pause).`}</b>}
              {follow && <span>Leurs nouvelles vidéos seront lues chaque nuit. Une chaîne sans compte YouTube relié ne peut pas être suivie : relie d’abord les comptes.</span>}
              {read && <>
                <b>{plural(read.channels, 'chaîne lue', 'chaînes lues')}, {plural(read.videos, 'nouvelle vidéo', 'nouvelles vidéos')}{read.skipped > 0 && ` (${plural(read.skipped, 'déjà lue écartée', 'déjà lues écartées')})`}, environ {read.units} unités du quota.</b>
                <span>{read.found.length === 0 ? 'Aucun nouveau code trouvé.' : `${plural(read.found.length, 'nouveau code', 'nouveaux codes')} en attente : ${read.found.map(item => `${item.code} (${item.tool})`).join(', ')}.`}</span>
                {read.suggested.length > 0 && <span>{plural(read.suggested.length, 'code', 'codes')} pour des outils absents du catalogue. <a href="/admin/podcasts?tab=outils">Voir les outils à ajouter</a></span>}
                {read.remaining > 0 && <span>{plural(read.remaining, 'chaîne', 'chaînes')} pas encore lue{read.remaining > 1 ? 's' : ''} : reclique pour continuer, sinon la suite passe cette nuit.</span>}
                {read.failed.length > 0 && <span>YouTube n’a pas répondu pour : {read.failed.join(', ')}.</span>}
                {read.found.length > 0 && <Link href="/admin/verifications" className="adm-btn adm-btn-pri">Ouvrir les vérifications</Link>}
              </>}
              <button type="button" className="adm-btn" onClick={close}>Fermer</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
