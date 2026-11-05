'use client';
// Comptes d'un créateur dans son panneau : niveau, abonnés, badge certifié, contrôle par l'admin.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatusDot, type Tone } from '@/components/admin-card';
import { FormDialog, sendJson } from '@/components/admin-form-dialog';
import { InfoTip } from '@/components/admin-info-tip';
import { PlatformIcon } from '@/components/platform-icon';
import { CREATOR_LEVEL_LABELS, MIN_RATINGS, MIN_SUBSCRIBERS, type CreatorLevel } from '@/lib/verification';
import { AccountClaim } from './account-claim';
import { audienceLine } from '@/lib/account-metrics';
import { PLATFORM_LABELS, formatSubscribers, type AdminCreatorAccount, type CreatorPlatform } from '@/lib/creator-accounts-display';

const LEVEL_TONES: Record<CreatorLevel, Tone> = { spotted: 'muted', checked: 'ok', verified: 'info' };

export function LevelDot({ level }: { level: CreatorLevel }) {
  return <StatusDot tone={LEVEL_TONES[level]}>{CREATOR_LEVEL_LABELS[level]}</StatusDot>;
}

const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });
const day = (iso: string) => dayFormat.format(new Date(iso));

// Ce qu'il manque à un compte pour faire monter le créateur d'un niveau, en une phrase.
function nextStep(account: AdminCreatorAccount): string | null {
  if (account.level !== 'spotted') return null;
  if (account.adminCheckedAt && account.subscribers !== null && account.subscribers < MIN_SUBSCRIBERS) return `Moins de ${MIN_SUBSCRIBERS} abonnés : le créateur reste repéré.`;
  if (account.adminCheckedAt && account.platform === 'podcast' && account.subscribers === null) {
    const ratings = account.metrics.ratingCount;
    return ratings === undefined
      ? `Note inconnue : clique sur « Actualiser ». Il faut au moins ${MIN_RATINGS} notes pour un podcast.`
      : `Moins de ${MIN_RATINGS} notes : le créateur reste repéré.`;
  }
  if (account.adminCheckedAt && account.subscribers === null) return 'Abonnés inconnus : indique-les pour atteindre le seuil.';
  return 'Contrôle le compte pour le passer « Contrôlé par Merkod ».';
}

export function CreatorAccountsPanel({ creatorId, creatorName, accounts, youtubeReady }: {
  creatorId: string; creatorName: string; accounts: AdminCreatorAccount[]; youtubeReady: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [platform, setPlatform] = useState<CreatorPlatform>('youtube');
  const [channel, setChannel] = useState('');
  const [handle, setHandle] = useState('');
  const [url, setUrl] = useState('');
  const [subscribers, setSubscribers] = useState('');

  async function act(key: string, request: () => Promise<string | null>) {
    setBusy(key);
    setError('');
    const failure = await request();
    setBusy(null);
    if (failure) setError(failure);
    else router.refresh();
  }
  const patch = (account: AdminCreatorAccount, body: Record<string, unknown>) => act(`${account.id}-patch`, () => sendJson(`/api/admin/creator-accounts/${account.id}`, 'PATCH', body));
  const refresh = (account: AdminCreatorAccount) => act(`${account.id}-refresh`, () => sendJson(`/api/admin/creator-accounts/${account.id}/refresh`, 'POST', {}));
  const remove = (account: AdminCreatorAccount) => {
    if (!window.confirm(`Retirer le compte ${account.handle} de ${creatorName} ? Le créateur et ses codes restent.`)) return;
    void act(`${account.id}-delete`, () => sendJson(`/api/admin/creator-accounts/${account.id}`, 'DELETE', {}));
  };
  const openAdd = () => { setPlatform('youtube'); setChannel(''); setHandle(''); setUrl(''); setSubscribers(''); setAdding(true); };
  const editSubscribers = (account: AdminCreatorAccount) => {
    const value = window.prompt(`Abonnés de ${account.handle} sur ${PLATFORM_LABELS[account.platform]} (laisse vide si inconnu)`, account.subscribers?.toString() ?? '');
    if (value !== null) void patch(account, { subscribers: value.trim() });
  };

  return (
    <div className="adm-ca">
      <div className="adm-ca-head">
        <span className="eyebrow">Comptes sur les réseaux</span>
        <button type="button" className="adm-btn" onClick={openAdd}>Relier un compte</button>
      </div>
      {accounts.length === 0 ? (
        <p className="muted">Aucun compte relié : le créateur reste « Repéré ». Relie sa chaîne YouTube pour lire ses abonnés et le contrôler.</p>
      ) : (
        <ul className="adm-ca-list">
          {accounts.map(account => {
            const audience = audienceLine(formatSubscribers(account.subscribers), account.metrics);
            const readAt = [account.subscribersAt, account.metricsAt].filter((at): at is string => at !== null).sort().at(-1);
            const hint = nextStep(account);
            return (
              <li key={account.id} className="adm-ca-item">
                <div className="adm-ca-row">
                  <div className="adm-ca-id">
                    <small className="adm-ca-platform"><PlatformIcon platform={account.platform} size={18} />{PLATFORM_LABELS[account.platform]}</small>
                    <a href={account.url} target="_blank" rel="noopener noreferrer"><b>{account.handle}</b> ↗</a>
                  </div>
                  <LevelDot level={account.level} />
                </div>
                <p className="adm-ca-subs">
                  {audience ?? (account.platform === 'podcast' ? 'Audience inconnue : clique sur « Actualiser »' : 'Abonnés inconnus')}
                  {readAt && <span> · relevé le {day(readAt)}</span>}
                </p>
                <label className="adm-ca-check">
                  <input type="checkbox" checked={account.adminCheckedAt !== null} disabled={busy !== null} onChange={event => patch(account, { adminChecked: event.target.checked })} />
                  <span>J’ai contrôlé ce compte{account.adminCheckedAt && <small> le {day(account.adminCheckedAt)}</small>}</span>
                  <InfoTip id={`ca-check-${account.id}`} label="Que contrôler ?">Le compte est réel et actif, il publie bien sous ce nom, et ce n’est pas une copie d’un autre créateur.</InfoTip>
                </label>
                <label className="adm-ca-check">
                  <input type="checkbox" checked={account.platformVerified} disabled={busy !== null} onChange={event => patch(account, { platformVerified: event.target.checked })} />
                  <span>Badge certifié du réseau</span>
                  <InfoTip id={`ca-badge-${account.id}`} label="Le badge certifié">Coche si la chaîne affiche la coche grise de compte certifié à côté de son nom. Le créateur passe alors « Contrôlé par Merkod », quel que soit son nombre d’abonnés.</InfoTip>
                </label>
                {hint && <p className="adm-ca-hint">{hint}</p>}
                <div className="adm-ca-actions">
                  {account.platform === 'youtube' && <button type="button" className="adm-btn" disabled={busy !== null || !youtubeReady} title={youtubeReady ? 'Relit les abonnés, le pseudo, les vues et les vidéos sur YouTube' : 'La clé YouTube manque'} onClick={() => refresh(account)}>{busy === `${account.id}-refresh` ? 'Lecture…' : 'Actualiser'}</button>}
                  {account.platform === 'podcast' && <button type="button" className="adm-btn" disabled={busy !== null} title="Relit la note et le nombre d’épisodes sur Apple Podcasts" onClick={() => refresh(account)}>{busy === `${account.id}-refresh` ? 'Lecture…' : 'Actualiser'}</button>}
                  {account.platform !== 'youtube' && <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => editSubscribers(account)}>Modifier les abonnés</button>}
                  <span style={{ flex: 1 }} />
                  <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => remove(account)}>Retirer</button>
                </div>
                <AccountClaim account={account} disabled={busy !== null} youtubeReady={youtubeReady} />
              </li>
            );
          })}
        </ul>
      )}
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <FormDialog open={adding} title={`Relier un compte à ${creatorName}`} submitLabel={platform === 'youtube' ? 'Lire la chaîne et relier' : 'Relier'}
        intro={platform === 'youtube' ? 'Merkod lit la chaîne sur YouTube : son identifiant, son nom et ses abonnés.' : 'Ce réseau n’a pas d’accès ouvert : recopie le pseudo, le lien et les abonnés affichés sur le profil.'}
        onClose={() => setAdding(false)}
        onSubmit={() => sendJson(`/api/admin/creators/${creatorId}/accounts`, 'POST', platform === 'youtube' ? { platform, channel } : { platform, handle, url, subscribers })}>
        <div className="field adm-span-2">
          <label htmlFor="ca-platform">Réseau</label>
          <select id="ca-platform" value={platform} onChange={event => setPlatform(event.target.value as CreatorPlatform)}>
            {(Object.keys(PLATFORM_LABELS) as CreatorPlatform[]).map(value => <option key={value} value={value}>{PLATFORM_LABELS[value]}</option>)}
          </select>
        </div>
        {platform === 'youtube' ? (
          <div className="field adm-span-2">
            <label htmlFor="ca-channel">Lien ou @pseudo de la chaîne</label>
            <input id="ca-channel" value={channel} onChange={event => setChannel(event.target.value)} placeholder="https://www.youtube.com/@pseudo" required maxLength={300} />
            {!youtubeReady && <small className="muted">La clé YouTube (YOUTUBE_API_KEY) manque sur ce serveur : la chaîne ne pourra pas être lue.</small>}
          </div>
        ) : <>
          <div className="field"><label htmlFor="ca-handle">Pseudo</label><input id="ca-handle" value={handle} onChange={event => setHandle(event.target.value)} placeholder="@pseudo" required maxLength={120} /></div>
          <div className="field"><label htmlFor="ca-subs">Abonnés (facultatif)</label><input id="ca-subs" inputMode="numeric" value={subscribers} onChange={event => setSubscribers(event.target.value)} placeholder="12 400" maxLength={16} /></div>
          <div className="field adm-span-2"><label htmlFor="ca-url">Lien du profil</label><input id="ca-url" type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://" required maxLength={500} /></div>
        </>}
      </FormDialog>
    </div>
  );
}
