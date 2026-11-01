export const metadata = { title: 'Confidentialité · Koupi' };

export default function Privacy() {
  return (
    <main className="k-page">
      <div className="k-wrap k-prose">
        <h1 style={{ fontSize: 'clamp(40px,5vw,64px)', marginBottom: 12 }}>Confidentialité</h1>
        <p>Koupi ne demande pas de compte et n&apos;utilise pas de publicité personnalisée. Ton vote est gardé dans ton navigateur pour ne pas te reposer la question. Côté serveur, une adresse IP hachée (jamais l&apos;IP elle-même) limite les abus pendant 24 heures, puis elle est effacée.</p>
        <h2>Mesure d&apos;audience</h2>
        <p>Pour savoir quels codes servent, Koupi compte chaque jour combien de fois un code est copié, combien de fois le lien d&apos;un créateur est ouvert, et quelles recherches ne trouvent aucun outil. Ce sont de simples totaux par jour : pas de cookie, pas de service tiers, aucun identifiant qui permette de te reconnaître ou de suivre ta visite.</p>
        <h2>Données envoyées</h2>
        <p>Les e-mails sont utilisés uniquement pour les alertes demandées et la confirmation associée. Tu peux demander leur suppression à [Adresse de contact].</p>
        <h2>Durées et droits</h2>
        <p>Les données sont conservées le temps nécessaire au fonctionnement du service. Tu peux demander l&apos;accès, la correction ou la suppression de tes données.</p>
      </div>
    </main>
  );
}
