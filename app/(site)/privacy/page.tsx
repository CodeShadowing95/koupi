export const metadata = { title: 'Confidentialité · Koupi' };

export default function Privacy() {
  return (
    <main className="k-page">
      <div className="k-wrap k-prose">
        <h1 style={{ fontSize: 'clamp(40px,5vw,64px)', marginBottom: 12 }}>Confidentialité</h1>
        <p>Koupi ne demande pas de compte et n&apos;utilise pas de publicité personnalisée. Les votes utilisent un identifiant anonyme d&apos;appareil et une adresse IP hachée pour limiter les abus.</p>
        <h2>Données envoyées</h2>
        <p>Les e-mails sont utilisés uniquement pour les alertes demandées et la confirmation associée. Tu peux demander leur suppression à [Adresse de contact].</p>
        <h2>Durées et droits</h2>
        <p>Les données sont conservées le temps nécessaire au fonctionnement du service. Tu peux demander l&apos;accès, la correction ou la suppression de tes données.</p>
      </div>
    </main>
  );
}
