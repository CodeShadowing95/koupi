import Link from 'next/link';
import { codes, tools } from '@/lib/data';
import { PendingCount } from './pending-count';

export default function Admin() {
  const toTest = codes.filter(code => code.status === 'to_test').length;
  const verified = codes.filter(code => code.status === 'verified').length;
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
          <div className="adm-stat"><strong>{tools.length}</strong><div><b>Outils suivis</b><span>Dans le catalogue</span></div></div>
          <div className="adm-stat"><strong>{verified}</strong><div><b>Codes vérifiés</b><span>Sur {codes.length} codes</span></div></div>
          <div className="adm-stat"><strong>{toTest}</strong><div><b>À tester</b><span>Retours nécessaires</span></div></div>
          <div className="adm-stat"><strong><PendingCount /></strong><div><b>Propositions</b><span>À traiter</span></div></div>
        </div>
        <div className="adm-actions">
          <Link className="adm-action" href="/admin/propositions"><div><b>File de validation</b><span>Les codes proposés restent privés jusqu&apos;à vérification manuelle.</span></div><span aria-hidden="true">→</span></Link>
          <Link className="adm-action" href="/admin/codes"><div><b>Codes publiés</b><span>Vérifie la source et le statut de chaque code.</span></div><span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </main>
  );
}
