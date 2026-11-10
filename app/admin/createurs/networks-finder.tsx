'use client';
// « ✦ Trouver ses réseaux » dans l'onglet Comptes d'un créateur : l'IA cherche sur le web ses autres comptes publics
// et les propose, chacun avec l'indice et la page où elle l'a vu. Rien n'est relié sans un clic sur « Relier ».
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendJson } from '@/components/admin-form-dialog';
import { InfoTip } from '@/components/admin-info-tip';
import { PlatformIcon } from '@/components/platform-icon';
import { PLATFORM_LABELS, formatSubscribers } from '@/lib/creator-accounts-display';
import type { NetworkProposal } from '@/lib/creator-networks-ai';

type Found = { proposals: NetworkProposal[]; note: string; costUsdMicros: number };

const centimes = (usdMicros: number) => `${Math.max(1, Math.round(usdMicros / 10_000))} centime${usdMicros >= 15_000 ? 's' : ''}`;
const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

export function NetworksFinder({ creatorId, ai }: { creatorId: string; ai: { active: boolean; label: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [found, setFound] = useState<Found | null>(null);

  async function search() {
    setBusy('search');
    setError('');
    try {
      const response = await fetch(`/api/admin/creators/${creatorId}/networks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      const body = await response.json().catch(() => ({})) as Partial<Found> & { error?: string };
      if (!response.ok || !body.proposals) setError(body.error || 'Recherche impossible pour le moment.');
      else setFound({ proposals: body.proposals, note: body.note ?? '', costUsdMicros: body.costUsdMicros ?? 0 });
    } catch {
      setError('Recherche impossible. Vérifie ta connexion.');
    }
    setBusy(null);
  }

  async function link(proposal: NetworkProposal) {
    setBusy(proposal.url);
    setError('');
    const failure = await sendJson(`/api/admin/creators/${creatorId}/accounts`, 'POST', proposal.platform === 'youtube'
      ? { platform: 'youtube', channel: proposal.url }
      : { platform: proposal.platform, handle: proposal.handle, url: proposal.url, subscribers: proposal.followers?.toString() ?? '' });
    setBusy(null);
    if (failure) { setError(failure); return; }
    setFound(value => value && { ...value, proposals: value.proposals.filter(item => item.url !== proposal.url) });
    router.refresh();
  }

  const title = ai.active ? 'L’IA cherche sur le web ses autres comptes publics (quelques centimes)' : `${ai.label} : relie ses comptes à la main.`;
  return (
    <div className="adm-nf">
      <div className="adm-nf-row">
        <button type="button" className="adm-btn adm-sugg-ai" disabled={!ai.active || busy !== null} title={title} onClick={search}>
          {busy === 'search' ? 'Recherche sur le web…' : found ? 'Relancer la recherche' : '✦ Trouver ses réseaux'}
        </button>
        <small className="muted">{busy === 'search' ? 'Ça prend souvent 20 à 60 secondes.' : ai.active ? 'L’IA cherche ses autres comptes sur le web. Tu choisis ceux à relier.' : title}{' '}
          <InfoTip id={`nf-${creatorId}`} label="Comment l’IA cherche">L’IA part de la description de sa chaîne YouTube, de ses comptes déjà reliés et des sources de ses codes, puis fait au plus 3 recherches web (1 centime chacune ; environ 4 centimes en tout). Elle ne lit pas les pages Instagram ou TikTok elles-mêmes : les abonnés viennent des résultats de recherche, vérifie-les en contrôlant le compte.</InfoTip>
        </small>
      </div>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {found && (
        <div aria-live="polite" className="adm-nf-found">
          {found.proposals.length === 0
            ? <p className="adm-ca-hint">Aucun autre compte trouvé.{found.note ? ` ${found.note}` : ''}</p>
            : <ul className="adm-ca-list">
                {found.proposals.map(proposal => {
                  const followers = formatSubscribers(proposal.followers);
                  return (
                    <li key={proposal.url} className="adm-ca-item adm-nf-item">
                      <div className="adm-ca-row">
                        <div className="adm-ca-id">
                          <small className="adm-ca-platform"><PlatformIcon platform={proposal.platform} size={18} />{PLATFORM_LABELS[proposal.platform]}</small>
                          <a href={proposal.url} target="_blank" rel="noopener noreferrer"><b>{proposal.handle}</b> ↗</a>
                        </div>
                        <span className={`adm-pill adm-nf-trust is-${proposal.confidence}`}>{proposal.confidence === 'sure' ? 'Lien officiel' : 'Probable'}</span>
                      </div>
                      {proposal.reason && <p className="adm-ca-hint">{proposal.reason}{proposal.source && <> · vu sur <a href={proposal.source} target="_blank" rel="noopener noreferrer">{hostOf(proposal.source)}</a></>}</p>}
                      {followers && proposal.platform !== 'youtube' && <p className="adm-ca-hint">Environ {followers} selon la recherche : à vérifier sur le profil.</p>}
                      <div className="adm-ca-actions">
                        <button type="button" className="adm-btn adm-btn-pri" disabled={busy !== null} onClick={() => link(proposal)}>{busy === proposal.url ? 'Ajout…' : 'Relier'}</button>
                        <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => setFound(value => value && { ...value, proposals: value.proposals.filter(item => item.url !== proposal.url) })}>Ignorer</button>
                      </div>
                    </li>
                  );
                })}
              </ul>}
          <p className="adm-nf-cost">Recherche : {centimes(found.costUsdMicros)} de dollar, comptés dans le plafond de l’IA.</p>
        </div>
      )}
    </div>
  );
}
