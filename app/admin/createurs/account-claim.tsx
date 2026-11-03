'use client';
// Preuve par la bio sur un compte (ADR-0020) : donner un code, le faire lire ou le constater, annuler, retirer.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InfoTip } from '@/components/admin-info-tip';
import { CLAIM_CODE_DAYS, PLATFORM_LABELS, claimMessage, type AdminCreatorAccount } from '@/lib/creator-accounts-display';

const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });
const day = (iso: string) => dayFormat.format(new Date(iso));
const expiry = (iso: string) => day(new Date(new Date(iso).getTime() + CLAIM_CODE_DAYS * 86_400_000).toISOString());

type Action = 'start' | 'check' | 'confirm' | 'cancel' | 'revoke';

export function AccountClaim({ account, disabled, youtubeReady }: { account: AdminCreatorAccount; disabled: boolean; youtubeReady: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [notice, setNotice] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  const [copied, setCopied] = useState<'code' | 'message' | null>(null);
  const readable = account.platform === 'youtube' && account.externalId !== null;

  async function run(action: Action) {
    if (action === 'revoke' && !window.confirm(`Retirer la preuve du compte ${account.handle} ? Le créateur ne sera plus « Créateur vérifié » grâce à ce compte.`)) return;
    if (action === 'confirm' && !window.confirm(`Tu as bien vu ${account.claimCode} dans la bio de ${account.handle} ?`)) return;
    setBusy(action);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/creator-accounts/${account.id}/claim`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
      const result = await response.json().catch(() => ({})) as { error?: string; found?: boolean };
      if (!response.ok) setNotice({ tone: 'error', text: result.error || 'L’étape a échoué.' });
      else if (result.found === false) setNotice({ tone: 'info', text: `Le code n’est pas encore dans la description de la chaîne. Réessaie quand le créateur te dit l’avoir ajouté.` });
      router.refresh();
    } catch {
      setNotice({ tone: 'error', text: 'L’étape a échoué. Vérifie ta connexion.' });
    }
    setBusy(null);
  }

  async function copy(kind: 'code' | 'message') {
    if (!account.claimCode) return;
    const text = kind === 'code' ? account.claimCode : claimMessage(account.claimCode, account.platform, account.handle);
    try { await navigator.clipboard.writeText(text); setCopied(kind); setTimeout(() => setCopied(null), 1600); } catch { window.prompt('Copie ce texte :', text); }
  }

  const off = disabled || busy !== null;
  // Garde-fou : pas de preuve sur un compte que l'admin n'a pas contrôlé (le serveur refuse aussi).
  const checked = account.adminCheckedAt !== null;
  const uncheckedHint = 'Contrôle d’abord ce compte (case ci-dessus) : c’est la garantie que la preuve porte sur le vrai compte du créateur, pas sur une copie.';
  return (
    <div className="adm-claim">
      <div className="adm-claim-head">
        <b>Preuve par la bio</b>
        <InfoTip id={`claim-${account.id}`} label="La preuve par la bio">Seul le vrai propriétaire du compte peut modifier sa bio. Tu lui donnes un code, il l’ajoute à sa bio, et le créateur passe « Créateur vérifié ». Il pourra retirer le code ensuite.</InfoTip>
      </div>

      {account.claimStatus === 'verified' ? (
        <div className="adm-claim-row">
          <span className="adm-claim-ok">✓ Prouvé par le créateur{account.claimedAt && <> le {day(account.claimedAt)}</>}</span>
          <button type="button" className="adm-btn" disabled={off} onClick={() => run('revoke')}>Retirer la preuve</button>
        </div>
      ) : account.claimStatus === 'pending' && account.claimCode && account.claimCodeAt ? (
        <>
          <div className="adm-claim-row">
            <code className="adm-claim-code">{account.claimCode}</code>
            <button type="button" className="adm-btn" onClick={() => copy('code')}>{copied === 'code' ? 'Copié' : 'Copier le code'}</button>
            <button type="button" className="adm-btn" onClick={() => copy('message')}>{copied === 'message' ? 'Copié' : 'Copier le message'}</button>
          </div>
          {!checked && <p className="adm-ca-hint">{uncheckedHint}</p>}
          <p className="adm-ca-hint">Donné le {day(account.claimCodeAt)}, valable jusqu’au {expiry(account.claimCodeAt)}. Envoie le message au créateur, puis {readable ? 'lis la bio quand il te dit l’avoir ajouté.' : `ouvre son profil ${PLATFORM_LABELS[account.platform]} et confirme quand tu vois le code.`}</p>
          <div className="adm-claim-row">
            {readable
              ? <button type="button" className="adm-btn adm-btn-pri" disabled={off || !youtubeReady || !checked} title={youtubeReady ? 'Lit la description de la chaîne sur YouTube (1 unité de quota)' : 'La clé YouTube manque'} onClick={() => run('check')}>{busy === 'check' ? 'Lecture…' : 'Lire la bio'}</button>
              : <button type="button" className="adm-btn adm-btn-pri" disabled={off || !checked} onClick={() => run('confirm')}>J’ai vu le code dans la bio</button>}
            <button type="button" className="adm-btn" disabled={off || !checked} onClick={() => run('start')}>Nouveau code</button>
            <button type="button" className="adm-btn" disabled={off} onClick={() => run('cancel')}>Annuler</button>
          </div>
        </>
      ) : (
        <div className="adm-claim-row">
          <span className="adm-ca-hint">{!checked ? uncheckedHint : account.claimStatus === 'revoked' ? 'Preuve retirée.' : 'Le créateur n’a pas encore prouvé que ce compte est le sien.'}</span>
          <button type="button" className="adm-btn" disabled={off || !checked} title={checked ? undefined : 'Contrôle d’abord ce compte'} onClick={() => run('start')}>{busy === 'start' ? 'Création…' : 'Donner un code'}</button>
        </div>
      )}
      {notice && <div className={`notice ${notice.tone === 'error' ? 'notice-error' : 'notice-info'}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</div>}
    </div>
  );
}
