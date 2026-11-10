'use client';
// Comptes d'un créateur dans son panneau, sur deux onglets :
// « Comptes » (relier, audience, pays, suivi des vidéos) et « Confiance » (contrôle, badge certifié, preuve par la bio).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatusDot, type Tone } from '@/components/admin-card';
import { FormDialog, sendJson } from '@/components/admin-form-dialog';
import { InfoTip } from '@/components/admin-info-tip';
import { PlatformIcon } from '@/components/platform-icon';
import { CREATOR_LEVEL_LABELS, MIN_RATINGS, MIN_SUBSCRIBERS, type CreatorLevel } from '@/lib/verification';
import { AccountClaim } from './account-claim';
import { NetworksFinder } from './networks-finder';
import { audienceLine } from '@/lib/account-metrics';
import { localeLabel } from '@/lib/creator-locale';
import { PLATFORM_LABELS, formatSubscribers, handleFromProfileUrl, profileUrlFor, type AdminCreatorAccount, type CreatorPlatform } from '@/lib/creator-accounts-display';
import { askText, confirmAction } from '@/components/admin-ask';

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

export function CreatorAccountsPanel({ creatorId, creatorName, accounts, youtubeReady, ai, mode, extra }: {
  creatorId: string; creatorName: string; accounts: AdminCreatorAccount[]; youtubeReady: boolean; mode: 'accounts' | 'trust';
  ai: { active: boolean; label: string };
  /** Actions en plus sous la liste des comptes (photo du créateur). */
  extra?: React.ReactNode;
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
  const watch = (account: AdminCreatorAccount, follow: boolean) => act(`${account.id}-watch`, () => sendJson(`/api/admin/creator-accounts/${account.id}/watch`, 'POST', { follow }));
  const refresh = (account: AdminCreatorAccount) => act(`${account.id}-refresh`, () => sendJson(`/api/admin/creator-accounts/${account.id}/refresh`, 'POST', {}));
  const remove = async (account: AdminCreatorAccount) => {
    if (!(await confirmAction(`Retirer le compte ${account.handle} de ${creatorName} ? Le créateur et ses codes restent.`, { confirmLabel: 'Retirer le compte', danger: true }))) return;
    void act(`${account.id}-delete`, () => sendJson(`/api/admin/creator-accounts/${account.id}`, 'DELETE', {}));
  };
  // Le pseudo remplit le lien du profil, et le lien collé remplit le pseudo, tant que l'admin n'a pas écrit l'autre lui-même.
  const typeHandle = (value: string) => {
    if (!url || url === profileUrlFor(platform, handle)) setUrl(profileUrlFor(platform, value) ?? '');
    setHandle(value);
  };
  const typeUrl = (value: string) => {
    if (!handle || handle === handleFromProfileUrl(platform, url)) setHandle(handleFromProfileUrl(platform, value) ?? '');
    setUrl(value);
  };
  const choosePlatform = (value: CreatorPlatform) => {
    if (url && url === profileUrlFor(platform, handle)) setUrl(profileUrlFor(value, handle) ?? '');
    setPlatform(value);
  };
  const openAdd = () => { setPlatform('youtube'); setChannel(''); setHandle(''); setUrl(''); setSubscribers(''); setAdding(true); };
  const editLocale = async (account: AdminCreatorAccount) => {
    const current = [account.metrics.country, account.metrics.language].filter(Boolean).join(' ');
    const value = await askText({ title: `Pays et langue de ${account.handle}`, message: 'En codes à deux lettres séparés par un espace. Laisse vide pour effacer.', label: 'Pays et langue', initial: current, placeholder: 'FR fr, BE fr, US en…' });
    if (value === null) return;
    const [country = '', language = ''] = value.trim().split(/[\s,;/]+/);
    void patch(account, { country, language });
  };
  const editSubscribers = async (account: AdminCreatorAccount) => {
    const value = await askText({ title: `Abonnés de ${account.handle} sur ${PLATFORM_LABELS[account.platform]}`, message: 'Laisse vide si tu ne le sais pas.', label: 'Abonnés', initial: account.subscribers?.toString() ?? '', inputMode: 'numeric', placeholder: '12000' });
    if (value !== null) void patch(account, { subscribers: value.trim() });
  };

  const head = (account: AdminCreatorAccount) => (
    <div className="adm-ca-row">
      <div className="adm-ca-id">
        <small className="adm-ca-platform"><PlatformIcon platform={account.platform} size={18} />{PLATFORM_LABELS[account.platform]}</small>
        <a href={account.url} target="_blank" rel="noopener noreferrer"><b>{account.handle}</b> ↗</a>
      </div>
      <LevelDot level={account.level} />
    </div>
  );

  return (
    <div className="adm-ca">
      {mode === 'accounts' ? <>
        <div className="adm-ca-head">
          <p className="adm-ca-intro">Ses chaînes et profils. Merkod lit l’audience de YouTube et des podcasts ; les autres réseaux se remplissent à la main.</p>
          <button type="button" className="adm-btn" onClick={openAdd}>Relier un compte</button>
        </div>
        {accounts.length === 0 ? (
          <p className="adm-ca-empty">Aucun compte relié. Relie sa chaîne YouTube pour lire ses abonnés, suivre ses vidéos et pouvoir le contrôler.</p>
        ) : (
          <ul className="adm-ca-list">
            {accounts.map(account => {
              const audience = audienceLine(formatSubscribers(account.subscribers), account.metrics);
              const readAt = [account.subscribersAt, account.metricsAt].filter((at): at is string => at !== null).sort().at(-1);
              return (
                <li key={account.id} className="adm-ca-item">
                  {head(account)}
                  <dl className="adm-ca-facts">
                    <div><dt>Audience</dt><dd>{audience ?? (account.platform === 'podcast' ? 'Inconnue : clique sur « Actualiser »' : 'Inconnue')}{readAt && <small> · relevée le {day(readAt)}</small>}</dd></div>
                    <div><dt>Pays et langue</dt><dd>{localeLabel({ country: account.metrics.country ?? null, language: account.metrics.language ?? null }) ?? 'Inconnus'}{account.metrics.localeManual && <small> · corrigés à la main</small>}</dd></div>
                  </dl>
                  {account.platform === 'youtube' && account.externalId && (
                    <label className="adm-ca-check adm-ca-watch">
                      <input type="checkbox" checked={account.watch?.active ?? false} disabled={busy !== null} onChange={event => watch(account, event.target.checked)} />
                      <span>Suivre ses vidéos chaque nuit{account.watch?.lastFetchedAt && <small> · lues le {day(account.watch.lastFetchedAt)}</small>}</span>
                      <InfoTip id={`ca-watch-${account.id}`} label="Suivre ses vidéos">Chaque nuit, Merkod lit les nouvelles vidéos de la chaîne et cherche des codes dans leur description (environ 1 unité du quota YouTube). Les codes trouvés arrivent « En attente » dans Vérifications.</InfoTip>
                    </label>
                  )}
                  <div className="adm-ca-actions">
                    {account.platform === 'youtube' && <button type="button" className="adm-btn" disabled={busy !== null || !youtubeReady} title={youtubeReady ? 'Relit les abonnés, le pseudo, les vues et les vidéos sur YouTube' : 'La clé YouTube manque'} onClick={() => refresh(account)}>{busy === `${account.id}-refresh` ? 'Lecture…' : 'Actualiser'}</button>}
                    {account.platform === 'podcast' && <button type="button" className="adm-btn" disabled={busy !== null} title="Relit la note et le nombre d’épisodes sur Apple Podcasts" onClick={() => refresh(account)}>{busy === `${account.id}-refresh` ? 'Lecture…' : 'Actualiser'}</button>}
                    {account.platform !== 'youtube' && <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => editSubscribers(account)}>Modifier les abonnés</button>}
                    <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => editLocale(account)}>Pays et langue</button>
                    <span style={{ flex: 1 }} />
                    <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => remove(account)}>Retirer</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <NetworksFinder key={creatorId} creatorId={creatorId} ai={ai} />
        {extra}
      </> : <>
        <p className="adm-ca-intro">Trois niveaux : <b>Repéré</b> (on a ses codes), <b>Contrôlé par Merkod</b> (tu as vérifié qu’un de ses comptes est réel et assez suivi), <b>Créateur vérifié</b> (il a prouvé que le compte est à lui). Le niveau du créateur est le meilleur de ses comptes.</p>
        {accounts.length === 0 ? (
          <p className="adm-ca-empty">Aucun compte à contrôler : relie d’abord un compte dans l’onglet « Comptes ».</p>
        ) : (
          <ul className="adm-ca-list">
            {accounts.map(account => {
              const hint = nextStep(account);
              return (
                <li key={account.id} className="adm-ca-item">
                  {head(account)}
                  {hint && <p className="adm-ca-hint">{hint}</p>}
                  <span className="adm-ca-step">Contrôle par Merkod</span>
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
                  <AccountClaim account={account} disabled={busy !== null} youtubeReady={youtubeReady} />
                </li>
              );
            })}
          </ul>
        )}
      </>}
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <FormDialog open={adding} title={`Relier un compte à ${creatorName}`} submitLabel={platform === 'youtube' ? 'Lire la chaîne et relier' : 'Relier'}
        intro={platform === 'youtube' ? 'Merkod lit la chaîne sur YouTube : son identifiant, son nom et ses abonnés.' : profileUrlFor(platform, 'pseudo') ? 'Ce réseau n’a pas d’accès ouvert : écris le pseudo ou colle le lien du profil, l’autre se remplit tout seul. Recopie les abonnés affichés sur le profil.' : 'Ce réseau n’a pas d’accès ouvert : recopie le pseudo, le lien et les abonnés affichés sur le profil.'}
        onClose={() => setAdding(false)}
        onSubmit={() => sendJson(`/api/admin/creators/${creatorId}/accounts`, 'POST', platform === 'youtube' ? { platform, channel } : { platform, handle, url, subscribers })}>
        <div className="field adm-span-2">
          <label htmlFor="ca-platform">Réseau</label>
          <select id="ca-platform" value={platform} onChange={event => choosePlatform(event.target.value as CreatorPlatform)}>
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
          <div className="field"><label htmlFor="ca-handle">Pseudo</label><input id="ca-handle" value={handle} onChange={event => typeHandle(event.target.value)} placeholder="@pseudo" required maxLength={120} /></div>
          <div className="field"><label htmlFor="ca-subs">Abonnés (facultatif)</label><input id="ca-subs" inputMode="numeric" value={subscribers} onChange={event => setSubscribers(event.target.value)} placeholder="12 400" maxLength={16} /></div>
          <div className="field adm-span-2"><label htmlFor="ca-url">Lien du profil</label><input id="ca-url" type="url" value={url} onChange={event => typeUrl(event.target.value)} placeholder={profileUrlFor(platform, 'pseudo') ?? 'https://'} required maxLength={500} /></div>
        </>}
      </FormDialog>
    </div>
  );
}
