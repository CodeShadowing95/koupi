'use client';
// Espace Administration : mettre le site en pause, allumer ou couper chaque page publique, gérer les comptes créateurs, relire le journal.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SITE_PAGES, pageSettingKey, type PageKey, type SitePage } from '@/lib/site-pages';
import { auditLabel, formatAuditDate } from '@/lib/admin-audit';
import type { AuditEntry, SiteSwitchRow } from '@/lib/site-settings';
import type { CreatorUserAction, CreatorUserItem } from '@/lib/creator-users-admin';

type Props = { off: PageKey[]; maintenance: boolean; rows: SiteSwitchRow[]; journal: AuditEntry[]; creatorUsers: CreatorUserItem[] };

const USER_QUESTIONS: Record<CreatorUserAction, (user: CreatorUserItem) => string> = {
  disable: user => `Désactiver le compte ${user.email} ? Sa session s’arrête tout de suite et il ne pourra plus se connecter tant que tu ne le réactives pas.`,
  enable: user => `Réactiver le compte ${user.email} ? Il pourra de nouveau se connecter.`,
  'remove-access': user => `Retirer à ${user.email} l’accès à la page ${user.creator?.name ?? ''} ? Le compte reste, sans page.`,
  delete: user => `Supprimer définitivement le compte ${user.email} ? Son e-mail est effacé partout (compte, liens, revendications, journal). La page publique et les codes restent. Impossible d’annuler.`,
};

function Switch({ on, label, disabled, onChange }: { on: boolean; label: string; disabled?: boolean; onChange?: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="adm-switch" disabled={disabled} onClick={onChange}>
      <span aria-hidden="true" />
    </button>
  );
}

export function AdministrationView({ off, maintenance, rows, journal, creatorUsers }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const changedAt = new Map(rows.map(row => [row.key, row.updatedAt]));

  async function toggle(target: string, enabled: boolean, question: string) {
    if (!window.confirm(question)) return;
    setBusy(target);
    setError('');
    try {
      const response = await fetch('/api/admin/site-settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target, enabled }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) setError(body.error || 'Le changement n’a pas pu être enregistré.');
      else router.refresh();
    } catch {
      setError('Le changement n’a pas pu être enregistré. Vérifie ta connexion.');
    }
    setBusy(null);
  }

  async function userAction(user: CreatorUserItem, action: CreatorUserAction) {
    if (!window.confirm(USER_QUESTIONS[action](user))) return;
    setBusy(user.id);
    setError('');
    try {
      const response = await fetch('/api/admin/creator-users', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: user.id, action }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) setError(body.error || 'Le changement n’a pas pu être enregistré.');
      else router.refresh();
    } catch {
      setError('Le changement n’a pas pu être enregistré. Vérifie ta connexion.');
    }
    setBusy(null);
  }

  function togglePage(page: SitePage) {
    const isOn = !off.includes(page.key);
    toggle(page.key, !isOn, isOn
      ? `Couper la page ${page.label} ? Elle répondra « page introuvable » (404) et ses liens disparaîtront du site.`
      : `Remettre la page ${page.label} en ligne ?`);
  }

  const onCount = SITE_PAGES.filter(page => !off.includes(page.key)).length;

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Administration</span>
            <h1>Administration du site</h1>
            <p>Ce que les visiteurs peuvent voir et qui peut entrer : mettre tout le site en pause, couper ou rallumer une page, gérer les comptes créateurs. Chaque geste est noté dans le journal. Rien ici ne suit les visiteurs.</p>
          </div>
        </div>

        {error && <div className="notice notice-error" role="alert">{error}</div>}

        <section className={`adm-maint${maintenance ? ' is-on' : ''}`} aria-labelledby="maint-title">
          <div>
            <h2 id="maint-title">Mode maintenance</h2>
            <p>{maintenance
              ? 'Le site est en pause : les visiteurs voient une page d’attente. Toi, connecté à l’admin, tu vois toujours le site.'
              : 'Met tout le site en pause derrière une page d’attente, sauf l’admin. Utile pendant une grosse mise à jour.'}</p>
            {changedAt.get('maintenance') && <small>Dernier changement {formatAuditDate(changedAt.get('maintenance')!)}</small>}
          </div>
          <div className="adm-maint-action">
            <span className={`adm-maint-state${maintenance ? ' is-on' : ''}`}>{maintenance ? 'En pause' : 'En ligne'}</span>
            <Switch on={maintenance} label="Mode maintenance" disabled={busy !== null}
              onChange={() => toggle('maintenance', !maintenance, maintenance ? 'Remettre le site en ligne pour tout le monde ?' : 'Mettre tout le site en pause ? Les visiteurs verront une page d’attente jusqu’à ce que tu le remettes en ligne.')} />
          </div>
        </section>

        <section className="adm-admin-block" aria-labelledby="pages-title">
          <div className="adm-admin-block-head">
            <h2 id="pages-title">Pages du site</h2>
            <span className="muted">{onCount} sur {SITE_PAGES.length} en ligne</span>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table adm-pages-table">
              <thead><tr><th scope="col">Page</th><th scope="col">Adresse</th><th scope="col">Si tu la coupes</th><th scope="col">Dernier changement</th><th scope="col">En ligne</th></tr></thead>
              <tbody>
                {SITE_PAGES.map(page => {
                  const isOn = !off.includes(page.key);
                  const at = changedAt.get(pageSettingKey(page.key));
                  return (
                    <tr key={page.key} className={isOn ? undefined : 'is-off'}>
                      <td><b>{page.label}</b>{!isOn && <span className="adm-page-off">Coupée</span>}</td>
                      <td className="adm-cell-nowrap"><code>{page.paths[0]}</code></td>
                      <td className="adm-cell-muted">{page.locked ? <span title={page.locked}>Toujours en ligne · {page.locked}</span> : page.effect}</td>
                      <td className="adm-cell-nowrap adm-cell-muted">{at ? formatAuditDate(at) : '—'}</td>
                      <td>{page.locked
                        ? <Switch on label={`${page.label} : toujours en ligne`} disabled />
                        : <Switch on={isOn} label={`${page.label} en ligne`} disabled={busy !== null} onChange={() => togglePage(page)} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="adm-admin-block" aria-labelledby="users-title">
          <div className="adm-admin-block-head">
            <h2 id="users-title">Comptes créateurs</h2>
            <span className="muted">{creatorUsers.length === 0 ? 'Aucun compte' : `${creatorUsers.length} compte${creatorUsers.length > 1 ? 's' : ''}`}</span>
          </div>
          <p className="adm-admin-note">Un compte naît quand un créateur se connecte par e-mail. On ne garde que son e-mail, la page qu’il gère et sa dernière connexion.</p>
          {creatorUsers.length === 0
            ? <p className="muted">Personne ne s’est encore connecté à l’espace créateur.</p>
            : (
              <div className="adm-table-wrap">
                <table className="adm-table adm-users-table">
                  <thead><tr><th scope="col">E-mail</th><th scope="col">Page gérée</th><th scope="col">Dernière connexion</th><th scope="col">État</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {creatorUsers.map(user => (
                      <tr key={user.id} className={user.disabledAt ? 'is-off' : undefined}>
                        <td><b>{user.email}</b></td>
                        <td>{user.creator ? <a href={`/creators/${user.creator.slug}`} target="_blank" rel="noreferrer">{user.creator.name}</a> : <span className="adm-cell-muted">Aucune</span>}</td>
                        <td className="adm-cell-nowrap adm-cell-muted">{user.lastSignInAt ? formatAuditDate(user.lastSignInAt) : '—'}</td>
                        <td>{user.disabledAt
                          ? <span className="adm-pill adm-pill-bad" title={`Depuis le ${formatAuditDate(user.disabledAt)}`}>Désactivé</span>
                          : <span className="adm-pill adm-pill-ok">Actif</span>}</td>
                        <td>
                          <div className="adm-users-actions">
                            {user.disabledAt
                              ? <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => userAction(user, 'enable')}>Réactiver</button>
                              : <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => userAction(user, 'disable')}>Désactiver</button>}
                            {user.creator && <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => userAction(user, 'remove-access')}>Retirer l’accès</button>}
                            <button type="button" className="adm-btn adm-btn-danger" disabled={busy !== null} onClick={() => userAction(user, 'delete')}>Supprimer</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </section>

        <section className="adm-admin-block" aria-labelledby="journal-title">
          <div className="adm-admin-block-head">
            <h2 id="journal-title">Journal</h2>
            <span className="muted">Gardé 12 mois · aucune donnée sur les visiteurs</span>
          </div>
          {journal.length === 0
            ? <p className="muted">Rien pour l’instant : chaque page coupée ou rallumée, chaque geste sur un compte apparaîtra ici.</p>
            : (
              <ol className="adm-journal">
                {journal.map(entry => (
                  <li key={entry.id}><time dateTime={entry.at}>{formatAuditDate(entry.at)}</time><span>{auditLabel(entry.action)} <b>{entry.target}</b></span></li>
                ))}
              </ol>
            )}
        </section>
      </div>
    </main>
  );
}
