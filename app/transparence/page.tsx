export default function Transparence() {
  return (
    <main className="page">
      <div className="container">
        <div className="page-head">
          <span className="eyebrow">Notre promesse</span>
          <h1>On préfère être clairs.</h1>
          <p className="hero-copy">Koupi est construit pour que les créateurs gardent le crédit de leur travail.</p>
        </div>
        <div className="prose">
          <div className="card card-strong">
            <h2>Comment on gagne de l&apos;argent</h2>
            <p>Aujourd&apos;hui, on ne gagne rien. Pas de publicité, pas de lien affilié à nous. Si cela change un jour, on l&apos;annoncera ici, et on ne prendra jamais la place des créateurs.</p>
          </div>
          <h2>Pourquoi on ne remplace jamais leur code</h2>
          <p>Le créateur touche sa commission : c&apos;est lui qui a fait le travail de recommandation. On affiche son code, sa source et son lien, sans ajouter de suivi caché.</p>
          <h2>Comment on vérifie</h2>
          <p>Chaque code vient d&apos;une vidéo ou d&apos;un post public. Il est testé à la main avant publication. La date est affichée, puis les votes de la communauté indiquent s&apos;il fonctionne encore.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span className="status status-ok">Vérifié : testé par nous</span>
            <span className="status status-warn">À tester : signalé ou pas encore testé</span>
            <span className="status status-bad">Expiré : ne marche plus</span>
          </div>
          <h2>Ce qu&apos;on fait de tes données</h2>
          <p>Pas de compte, pas de cookie publicitaire. Le trousseau reste dans ton navigateur. Un e-mail sert uniquement aux alertes que tu demandes. Les adresses IP ne sont jamais stockées en clair.</p>
          <h2>Tu es créateur ?</h2>
          <p>Tu veux confirmer, corriger ou retirer un code ? Écris-nous à <strong>[Adresse de contact]</strong>.</p>
        </div>
      </div>
    </main>
  );
}
