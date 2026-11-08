'use client';
// Preuve par la bio en libre-service (ADR-0041), dans l'espace du créateur connecté qui revendique une page.
// Un compte à la fois : obtenir son code, le coller dans sa bio, puis « Vérifier » (YouTube) ou « C'est fait » (autres réseaux).
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ProofState, SelfProofAccount, SelfProofCreator } from '@/lib/creator-self-proof';
import { PlatformIcon } from '@/components/platform-icon';
import { CLAIM_CODE_DAYS } from '@/lib/creator-accounts-display';

type Reply = { ok?: boolean; error?: string; state?: ProofState; code?: string | null; found?: boolean };

const WHERE: Partial<Record<SelfProofAccount['platform'], string>> = {
  youtube: 'YouTube Studio › Personnalisation › Informations de base › Description',
  tiktok: 'TikTok › Profil › Modifier le profil › Bio',
  instagram: 'Instagram › Profil › Modifier le profil › Bio',
};

function Account({ account }: { account: SelfProofAccount }) {
  const router = useRouter();
  const [state, setState] = useState(account.state);
  const [code, setCode] = useState(account.code);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function run(action: 'start' | 'check' | 'submit') {
    setBusy(true); setError(''); setNote('');
    try {
      const response = await fetch('/api/creator-proof', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accountId: account.id, action }) });
      const reply = await response.json().catch(() => ({})) as Reply;
      if (!response.ok || !reply.ok) { setError(reply.error ?? 'Impossible pour le moment. Réessaie dans un moment.'); return; }
      setState(reply.state!);
      setCode(reply.code ?? null);
      if (reply.state === 'proven') { setNote('C’est prouvé ! Ton espace s’ouvre.'); router.refresh(); return; }
      if (action === 'check' && reply.found === false) setNote('Pas encore trouvé. YouTube met parfois quelques minutes à enregistrer la description : réessaie dans un moment.');
    } catch { setError('Pas de connexion. Réessaie dans un moment.'); } finally { setBusy(false); }
  }

  async function copy() {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { window.prompt('Copie ce code :', code); }
  }

  return (
    <li className={`k-cp-acc is-${state}`}>
      <div className="k-cp-head">
        <PlatformIcon platform={account.platform} size={22} className="k-platform-icon" />
        <a href={account.url} target="_blank" rel="noopener noreferrer nofollow">{account.handle}</a>
        <small>{account.label}</small>
      </div>

      {state === 'unchecked' && <p className="k-cp-msg">Merkod vérifie d’abord que ce compte existe et publie bien sous ce nom. Tu pourras le prouver juste après.</p>}
      {state === 'proven' && <p className="k-cp-msg is-ok">Compte prouvé.</p>}
      {state === 'locked' && <p className="k-cp-msg">La preuve est fermée sur ce compte. Écris-nous depuis la page Ton avis.</p>}
      {state === 'waiting' && <p className="k-cp-msg">C’est noté : Merkod regarde ta bio et t’ouvre ton espace dès que le code y est. Laisse-le en place d’ici là.</p>}

      {(state === 'open' || state === 'expired') && !code && (
        <div className="k-cp-start">
          {state === 'expired' && <p className="k-cp-msg">Ton code a plus de {CLAIM_CODE_DAYS} jours. Prends-en un nouveau.</p>}
          <button type="button" className="k-btn k-btn-primary" disabled={busy} onClick={() => run('start')}>{busy ? 'Un instant…' : 'Obtenir mon code'}</button>
        </div>
      )}

      {state === 'open' && code && (
        <ol className="k-cp-steps">
          <li>
            <b>Copie ton code</b>
            <button type="button" className="k-cp-code" onClick={copy} aria-label={`Copier le code ${code}`}>
              <span>{code}</span><em>{copied ? 'Copié' : 'Copier'}</em>
            </button>
          </li>
          <li><b>Colle-le dans ta bio</b><span>{WHERE[account.platform] ?? 'Dans la bio de ce compte'}. N’importe où, avec le reste du texte. Tu pourras l’enlever une fois prouvé.</span></li>
          <li>
            <b>{account.readable ? 'Merkod lit ta description' : 'Dis-nous quand c’est fait'}</b>
            <button type="button" className="k-btn k-btn-primary" disabled={busy} onClick={() => run(account.readable ? 'check' : 'submit')}>
              {busy ? 'Un instant…' : account.readable ? 'Vérifier ma description' : 'C’est fait'}
            </button>
          </li>
        </ol>
      )}

      {note && <p className="k-cp-msg is-note" role="status">{note}</p>}
      {error && <p className="k-cp-msg is-error" role="alert">{error}</p>}
    </li>
  );
}

export function CreatorProof({ pages }: { pages: SelfProofCreator[] }) {
  return (
    <div className="k-cp">
      {pages.map(page => (
        <section key={page.slug} className="k-cp-page" aria-labelledby={`cp-${page.slug}`}>
          <h2 id={`cp-${page.slug}`} className="k-st-h2">Prouve que {page.name}, c’est toi</h2>
          {page.accounts.length === 0
            ? <p className="k-cp-msg">Merkod n’a encore relié aucun compte à cette page. On le fait à partir du lien que tu as donné, puis tu pourras le prouver ici.</p>
            : <ul className="k-cp-list">{page.accounts.map(account => <Account key={account.id} account={account} />)}</ul>}
        </section>
      ))}
      <p className="k-st-muted">Le code ne sert qu’à montrer que tu tiens ce compte : seul son vrai propriétaire peut modifier sa bio. Un seul compte prouvé suffit.</p>
    </div>
  );
}
