import { CONTACT_EMAIL } from '@/lib/site-contact';
import { PageHead } from '@/components/site/page-head';

export const metadata = { title: 'Confidentialité · Koupi' };

export default function Privacy() {
  return (
    <main className="k-page">
      <div className="k-wrap">
        <PageHead eyebrow="Koupi" title="Confidentialité" />
        <div className="k-prose">
          <p>Koupi ne demande pas de compte aux visiteurs et n&apos;utilise pas de publicité personnalisée. Ton vote est gardé dans ton navigateur pour ne pas te reposer la question. Côté serveur, une adresse IP hachée (jamais l&apos;IP elle-même) limite les abus pendant 24 heures, puis elle est effacée.</p>
          <h2>Mesure d&apos;audience</h2>
          <p>Pour savoir quels codes servent, Koupi compte chaque jour combien de fois un code est copié, combien de fois le lien d&apos;un créateur est ouvert, et quelles recherches ne trouvent aucun outil. Ce sont de simples totaux par jour : pas de cookie, pas de service tiers, aucun identifiant qui permette de te reconnaître ou de suivre ta visite.</p>
          <h2>Données envoyées</h2>
          <p>Les e-mails sont utilisés uniquement pour les alertes demandées et la confirmation associée. Tu peux demander leur suppression à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
          <h2>Espace créateur</h2>
          <p>Un créateur qui se connecte à son espace donne son adresse e-mail. Elle sert à lui envoyer son lien de connexion et à le recontacter au sujet de sa page, rien d&apos;autre. Le lien marche une seule fois, pendant 20 minutes. Une fois connecté, un cookie de session (nécessaire au fonctionnement, sans pistage) le garde connecté 30 jours au plus. Les e-mails partent par Resend, notre prestataire d&apos;envoi.</p>
          <p>L&apos;éditeur du site voit, pour chaque compte créateur, son e-mail, la page qu&apos;il gère et la date de sa dernière connexion, rien de plus. Il peut désactiver un compte (par exemple en cas d&apos;usurpation), lui retirer l&apos;accès à une page ou le supprimer. Sur demande, la suppression efface ton e-mail du compte, des liens de connexion, des revendications et du journal d&apos;administration ; ta page publique et ses codes restent, car ils viennent de tes contenus publics.</p>
          <h2>Durées et droits</h2>
          <p>Les données sont conservées le temps nécessaire au fonctionnement du service. Le journal d&apos;administration, qui note les gestes de l&apos;éditeur (page coupée, compte désactivé…), est effacé au bout de 12 mois. Tu peux demander l&apos;accès, la correction ou la suppression de tes données à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> ; la réponse arrive sous un mois.</p>
        </div>
      </div>
    </main>
  );
}
