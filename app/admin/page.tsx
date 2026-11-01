import Link from 'next/link';
import { codes, tools, trackedTools } from '@/lib/data';
import { PendingBadge, PendingCount } from './pending-count';

export default function Admin() {
  const toTest = codes.filter(code => code.status === 'to_test').length;
  const verified = codes.filter(code => code.status === 'verified').length;
  const pending = codes.filter(code => code.status === 'pending').length;
  const rejected = codes.filter(code => code.status === 'rejected').length;
  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Espace privé</span>
            <h1>Tableau de bord</h1>
            <p>La modération Koupi, au même endroit.</p>
          </div>
        </div>
        <div className="adm-stats">
          <div className="adm-stat"><strong>{trackedTools}</strong><div><b>Outils suivis</b><span>{tools.length} avec un code publié</span></div></div>
          <div className="adm-stat"><strong>{verified}</strong><div><b>Codes vérifiés</b><span>Sur {codes.length} candidats</span></div></div>
          <div className="adm-stat"><strong>{toTest}</strong><div><b>À tester</b><span>Visibles, retours nécessaires</span></div></div>
          <div className="adm-stat"><strong>{pending}</strong><div><b>En attente</b><span>{rejected} rejetés au tri</span></div></div>
          <div className="adm-stat"><strong><PendingCount /></strong><div><b>Propositions</b><span>À traiter</span></div></div>
        </div>
        <div className="adm-actions">
          <Link className="adm-action" href="/admin/propositions"><div><b>File de validation <PendingBadge /></b><span>Les codes proposés restent privés jusqu&apos;à vérification manuelle.</span></div><span aria-hidden="true">→</span></Link>
          <Link className="adm-action" href="/admin/codes"><div><b>Codes publiés</b><span>Vérifie la source et le statut de chaque code.</span></div><span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </main>
  );
}
