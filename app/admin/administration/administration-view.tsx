'use client';
// Espace Administration : mettre le site en pause, choisir si l'IA relève les liens d'affiliation, allumer ou couper chaque page publique, gérer les comptes créateurs, relire le journal.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OFFER_LINKS_KEY, SITE_PAGES, pageSettingKey, type PageKey, type SitePage } from '@/lib/site-pages';
import { auditLabel, formatAuditDate } from '@/lib/admin-audit';
import type { AuditEntry, SiteSwitchRow } from '@/lib/site-settings';
import type { CreatorUserAction, CreatorUserItem } from '@/lib/creator-users-admin';
import { confirmAction } from '@/components/admin-ask';
import type { AdminUniverse, FamilyInUniverse } from '@/lib/universes-admin';
import { DEFAULT_UNIVERSE } from '@/lib/universes';

type Props = { off: PageKey[]; maintenance: boolean; offerLinks: boolean; rows: SiteSwitchRow[]; journal: AuditEntry[]; creatorUsers: CreatorUserItem[]; universes: AdminUniverse[]; families: FamilyInUniverse[] };

const USER_QUESTIONS: Record<CreatorUserAction, (user: CreatorUserItem) => string> = {
  disable: user => `Désactiver le compte ${user.email} ? Sa session s’arrête tout de suite et il ne pourra plus se connecter tant que tu ne le réactives pas.`,
  enable: user => `Réactiver le compte ${user.email} ? Il pourra de nouveau se connecter.`,
  'remove-access': user => `Retirer à ${user.email} l’accès à la page ${user.creator?.name ?? ''} ? Le compte reste, sans page.`,
  delete: user => `Supprimer définitivement le compte ${user.email} ? Son e-mail est effacé partout (compte, liens, revendications, journal). La page publique et les codes restent. Impossible d’annuler.`,
};

const USER_LABELS: Record<CreatorUserAction, string> = { disable: 'Désactiver', enable: 'Réactiver', 'remove-access': 'Retirer l’accès', delete: 'Supprimer définitivement' };

function Switch({ on, label, disabled, onChange }: { on: boolean; label: string; disabled?: boolean; onChange?: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="adm-switch" disabled={disabled} onClick={onChange}>
      <span aria-hidden="true" />
    </button>
  );
}

export function AdministrationView({ off, maintenance, offerLinks, rows, journal, creatorUsers, universes, families }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const changedAt = new Map(rows.map(row => [row.key, row.updatedAt]));

  async function toggle(target: string, enabled: boolean, question: string, cutLabel: string | null, onLabel = 'Remettre en ligne') {
    // cutLabel : le bouton d'une action qui coupe quelque chose (en rouge) ; null pour remettre en ligne (onLabel).
    if (!(await confirmAction(question, { confirmLabel: cutLabel ?? onLabel, danger: cutLabel !== null }))) return;
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
    if (!(await confirmAction(USER_QUESTIONS[action](user), { confirmLabel: USER_LABELS[action], danger: action !== 'enable' }))) return;
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
      : `Remettre la page ${page.label} en ligne ?`, isOn ? 'Couper la page' : null);
  }

  async function send(target: string, url: string, body: Record<string, unknown>) {
    setBusy(target);
    setError('');
    try {
      const response = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const reply = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) setError(reply.error || 'Le changement n’a pas pu être enregistré.');
      else router.refresh();
    } catch {
      setError('Le changement n’a pas pu être enregistré. Vérifie ta connexion.');
    }
    setBusy(null);
  }

  async function toggleUniverse(universe: AdminUniverse) {
    const question = universe.visible
      ? `Éteindre l’univers ${universe.name} ? Ses ${universe.tools} marques, leurs codes et leurs catégories disparaissent du site. Tout reste dans l’admin.`
      : `Montrer l’univers ${universe.name} sur le site ? Ses marques avec un code visible apparaissent dans Explorer, la recherche, les pages créateur et le sitemap.`;
    if (!(await confirmAction(question, { confirmLabel: universe.visible ? 'Éteindre' : 'Montrer sur le site', danger: universe.visible }))) return;
    await send(`universe:${universe.slug}`, '/api/admin/universes', { slug: universe.slug, visible: !universe.visible });
  }

  const universeName = new Map(universes.map(universe => [universe.slug, universe.name]));
  const onCount = SITE_PAGES.filter(page => !off.includes(page.key)).length;

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Administration</span>
            <h1>Administration du site</h1>
            <p>Ce que les visiteurs peuvent voir et qui peut entrer : mettre tout le site en pause, couper ou rallumer une page, choisir si l’IA relève les liens d’affiliation, gérer les comptes créateurs. Chaque geste est noté dans le journal. Rien ici ne suit les visiteurs.</p>
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
              onChange={() => toggle('maintenance', !maintenance, maintenance ? 'Remettre le site en ligne pour tout le monde ?' : 'Mettre tout le site en pause ? Les visiteurs verront une page d’attente jusqu’à ce que tu le remettes en ligne.', maintenance ? null : 'Mettre en pause')} />
          </div>
        </section>

        <section className="adm-maint adm-option" aria-labelledby="offer-links-title">
          <div>
            <h2 id="offer-links-title">Liens d’affiliation</h2>
            <p>{offerLinks
              ? 'L’IA relève les codes promo et aussi les liens d’offre des créateurs (avec ou sans code). Les offres par lien arrivent en attente dans Vérifications, comme les codes.'
              : 'L’IA ne relève que les codes promo. Les liens d’affiliation des descriptions sont ignorés. Tu peux toujours ajouter un lien d’offre à la main sur un code.'}</p>
            {changedAt.get(OFFER_LINKS_KEY) && <small>Dernier changement {formatAuditDate(changedAt.get(OFFER_LINKS_KEY)!)}</small>}
          </div>
          <div className="adm-maint-action">
            <span className="adm-maint-state">{offerLinks ? 'Activés' : 'Codes seuls'}</span>
            <Switch on={offerLinks} label="Relever les liens d’affiliation" disabled={busy !== null}
              onChange={() => toggle(OFFER_LINKS_KEY, !offerLinks, offerLinks
                ? 'Ne plus relever les liens d’affiliation ? Les prochaines lectures (chaînes, podcasts, recherches, vérifications) ne garderont que les codes promo. Les offres déjà enregistrées restent.'
                : 'Relever aussi les liens d’affiliation ? Les prochaines lectures garderont les offres par lien (avec une réduction écrite), à valider dans Vérifications.',
              offerLinks ? 'Couper les liens' : null, 'Activer les liens')} />
          </div>
        </section>

        <section className="adm-admin-block" aria-labelledby="universes-title">
          <div className="adm-admin-block-head">
            <h2 id="universes-title">Univers</h2>
            <span className="muted">{universes.filter(universe => universe.visible).length} sur {universes.length} montrés sur le site</span>
          </div>
          <p className="adm-admin-note">Merkod promet des codes pour les outils en ligne. Les autres marques (beauté, mode, maison…) sont gardées dans leur univers : tu les vois partout dans l’admin, mais le site ne les montre que si tu allumes leur univers. Pour y ranger des marques, utilise « ✦ Ranger par univers » dans Catégories.</p>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th scope="col">Univers</th><th scope="col">Familles</th><th scope="col">Marques suivies</th><th scope="col">Sur le site</th></tr></thead>
              <tbody>
                {universes.map(universe => (
                  <tr key={universe.slug} className={universe.visible ? undefined : 'is-off'}>
                    <td><b>{universe.name}</b>{!universe.visible && <span className="adm-page-off">Caché</span>}</td>
                    <td className="adm-cell-muted">{universe.families}</td>
                    <td className="adm-cell-muted">{universe.tools}</td>
                    <td>{universe.slug === DEFAULT_UNIVERSE
                      ? <Switch on label={`${universe.name} : toujours visible`} disabled />
                      : <Switch on={universe.visible} label={`${universe.name} visible sur le site`} disabled={busy !== null} onChange={() => toggleUniverse(universe)} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="adm-admin-details">
            <summary>Univers de chaque famille ({families.length})</summary>
            <p className="adm-admin-note">Une famille emporte ses catégories et ses outils dans l’univers choisi.</p>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th scope="col">Famille</th><th scope="col">Univers</th></tr></thead>
                <tbody>
                  {families.map(family => (
                    <tr key={family.slug}>
                      <td><b>{family.name}</b></td>
                      <td>
                        <label htmlFor={`family-universe-${family.slug}`} className="sr-only">Univers de {family.name}</label>
                        <select id={`family-universe-${family.slug}`} className="adm-inline-select" value={family.universe} disabled={busy !== null}
                          onChange={event => send(`family:${family.slug}`, '/api/admin/families', { slug: family.slug, universe: event.target.value })}>
                          {universes.map(universe => <option key={universe.slug} value={universe.slug}>{universe.name}</option>)}
                        </select>
                        {!universeName.has(family.universe) && <span className="adm-cell-muted"> {family.universe}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
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
