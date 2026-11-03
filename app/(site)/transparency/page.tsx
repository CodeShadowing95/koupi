export const metadata = { title: 'Transparence · Koupi' };

export default function Transparency() {
  return (
    <main className="k-page">
      <div className="k-wrap">
        <div className="k-page-head">
          <span className="k-eyebrow">Notre promesse</span>
          <h1>On préfère être clairs.</h1>
          <p>Koupi est construit pour que les créateurs gardent le crédit de leur travail.</p>
        </div>
        <div className="k-prose">
          <div className="k-panel k-panel-glow">
            <h2>Comment on gagne de l&apos;argent</h2>
            <p>Aujourd&apos;hui, on ne gagne rien. Pas de publicité, pas de lien affilié à nous. Si cela change un jour, on l&apos;annoncera ici, et on ne prendra jamais la place des créateurs.</p>
          </div>
          <h2>Pourquoi on ne remplace jamais leur code</h2>
          <p>Le créateur touche sa commission : c&apos;est lui qui a fait le travail de recommandation. On affiche son code, sa source et son lien, sans ajouter de suivi caché.</p>
          <h2>Comment on vérifie</h2>
          <p>Chaque code vient d&apos;une vidéo, d&apos;un épisode ou d&apos;un post public. Avant de le publier, on vérifie qu&apos;il y figure bien, donné par le créateur. Quand on a pu l&apos;essayer jusqu&apos;à la page de paiement, on le dit aussi. La date est affichée, puis les votes de la communauté indiquent s&apos;il fonctionne encore.</p>
          <p>On contrôle aussi les créateurs. Quand on a vérifié qu&apos;un compte est réel, actif et publie bien sous ce nom (avec au moins 1 000 abonnés, ou le badge certifié du réseau), le créateur porte la marque <b>✓ Contrôlé par Koupi</b>. Un créateur peut aussi prouver lui-même qu&apos;un compte est le sien : on lui donne un code, il l&apos;ajoute à la bio de ce compte, et on le retrouve. Lui seul peut modifier cette bio. Il devient alors <b>Créateur vérifié</b>, et ce compte porte une coche bleue sur sa page.</p>
          <p>Un outil d&apos;IA nous aide à lire les descriptions des vidéos pour y repérer les codes. Il ne reçoit que ces textes publics, jamais tes données, et la décision de publier reste humaine.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span className="k-status k-status-ok is-dark">Testé au paiement : la réduction s&apos;appliquait</span>
            <span className="k-status k-status-ok is-dark">Source vérifiée : le code vient bien du créateur</span>
            <span className="k-status k-status-warn is-dark">À tester : signalé ou pas encore testé</span>
            <span className="k-status k-status-bad is-dark">Expiré : ne marche plus</span>
          </div>
          <h2>Ce qu&apos;on fait de tes données</h2>
          <p>Pas de compte, pas de cookie publicitaire. Le trousseau reste dans ton navigateur. Un e-mail sert uniquement aux alertes que tu demandes. Les adresses IP ne sont jamais stockées en clair. Quand tu copies un code, on ajoute 1 au total du jour pour ce code, rien d&apos;autre : c&apos;est ce total qu&apos;affiche la page d&apos;un créateur (« copies ce mois-ci »).</p>
          <h2>Les logos des outils</h2>
          <p>Les logos servent seulement à reconnaître chaque outil et restent la propriété de leurs marques. Ils viennent de <a href="https://logo.dev" target="_blank" rel="noopener">Logo.dev</a>, de Simple Icons (licence CC0) ou du site officiel de l&apos;outil. Ils sont téléchargés une fois, et sont servis par Koupi : ton navigateur ne contacte aucun service tiers pour les afficher.</p>
          <h2>Tu es créateur ?</h2>
          <p>Tu veux confirmer, corriger ou retirer un code ? Écris-nous à <strong>[Adresse de contact]</strong>.</p>
        </div>
      </div>
    </main>
  );
}
