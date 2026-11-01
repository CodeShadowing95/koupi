import Link from 'next/link';
import { FLAG_MAX_SUCCESS, FLAG_MIN_VOTES, TARGETS } from '@/lib/admin-stats';

// Guide de l'admin : la vie d'un code, les indicateurs expliqués, la routine et les mots du métier.
export default function AdminGuide() {
  return (
    <main className="adm-page">
      <div className="container" style={{ maxWidth: 1120 }}>
        <div className="adm-head">
          <div>
            <span className="eyebrow">Apprendre</span>
            <h1>Guide de l’admin Koupi</h1>
            <p>Tout ce qu’il faut savoir pour faire tourner un site de codes promo : ce que tu modères, les chiffres à surveiller et la routine qui marche.</p>
          </div>
        </div>

        <section className="adm-panel" aria-labelledby="cycle">
          <h2 id="cycle">1. La vie d’un code</h2>
          <div className="adm-steps">
            <div className="adm-step"><b>Trouvé</b><span>Par le script YouTube ou proposé par un visiteur.</span></div>
            <div className="adm-step-arrow" aria-hidden="true">→</div>
            <div className="adm-step"><b>En attente</b><span>Privé. Tu vérifies que la source existe et que le code vient bien du créateur.</span></div>
            <div className="adm-step-arrow" aria-hidden="true">→</div>
            <div className="adm-step" data-tone="warn"><b>À tester</b><span>Visible avec la mention « à tester ». Les votes des visiteurs arrivent.</span></div>
            <div className="adm-step-arrow" aria-hidden="true">→</div>
            <div className="adm-step" data-tone="ok"><b>Vérifié</b><span>Tu l’as testé toi-même. C’est la promesse Koupi.</span></div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>À chaque étape, un code peut partir en <b>Rejeté</b> : code mort, offre officielle de la marque (pas d’un créateur), produit flou. Rejeter n’est pas un échec : c’est ce qui rend le catalogue fiable.</p>
        </section>

        <section aria-labelledby="lexique" style={{ marginTop: 24 }}>
          <h2 id="lexique" style={{ margin: '0 0 12px', fontSize: 18, fontFamily: 'var(--font-body)', letterSpacing: 0 }}>2. Les indicateurs, expliqués simplement</h2>
          <div className="adm-row adm-row-2" style={{ marginTop: 0 }}>
            <article className="adm-panel">
              <h3 style={{ margin: 0, fontSize: 15 }}>Couverture du catalogue</h3>
              <span className="adm-formula">outils avec un code visible ÷ outils suivis</span>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Un visiteur arrive en cherchant un outil précis. S’il n’y a pas de code, il repart. <b>Bon niveau</b> : {TARGETS.coverage} % au lancement, 80 % ensuite. <b>Si c’est bas</b> : traite les codes en attente, puis cherche des créateurs pour les outils vides.</p>
            </article>
            <article className="adm-panel">
              <h3 style={{ margin: 0, fontSize: 15 }}>Codes vérifiés</h3>
              <span className="adm-formula">codes vérifiés ÷ codes visibles</span>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>La confiance. Les gros sites de codes sont connus pour leurs codes morts : c’est là que Koupi se distingue. <b>Bon niveau</b> : plus de {TARGETS.verified} %. <b>Si c’est bas</b> : 10 minutes de tests par jour depuis l’onglet « À tester ».</p>
            </article>
            <article className="adm-panel">
              <h3 style={{ margin: 0, fontSize: 15 }}>Réussite déclarée</h3>
              <span className="adm-formula">votes « ça marche » ÷ tous les votes</span>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Ce que vivent les visiteurs. <b>Bon niveau</b> : {TARGETS.success} % et plus. <b>Si un code passe sous {FLAG_MAX_SUCCESS} %</b> avec au moins {FLAG_MIN_VOTES} votes, il apparaît dans « À faire » : reteste-le.</p>
            </article>
            <article className="adm-panel">
              <h3 style={{ margin: 0, fontSize: 15 }}>Délai de modération</h3>
              <span className="adm-formula">médiane (décision − réception), 30 derniers jours</span>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Un visiteur qui propose un code attend une réponse. <b>Bon niveau</b> : moins de {TARGETS.delayHours} h. <b>Si c’est haut</b> : passe sur « Propositions » une fois par jour, même 2 minutes.</p>
            </article>
            <article className="adm-panel adm-panel-dashed">
              <h3 style={{ margin: 0, fontSize: 15 }}>Codes copiés et clics vers l’outil <span className="adm-soon">À brancher</span></h3>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Le cœur du métier. « Copié » : le visiteur a trouvé. « Clic vers l’outil » : ce que les marques paieront plus tard (offre B2B). Le rapport clics ÷ visiteurs s’appelle le <b>taux de conversion</b>.</p>
            </article>
            <article className="adm-panel adm-panel-dashed">
              <h3 style={{ margin: 0, fontSize: 15 }}>Recherches sans résultat <span className="adm-soon">À brancher</span></h3>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>La meilleure liste de courses : les outils que les gens tapent dans la recherche et que tu n’as pas. C’est par là qu’on choisit les prochains outils à suivre.</p>
            </article>
          </div>
        </section>

        <section className="adm-panel" aria-labelledby="routine" style={{ marginTop: 24 }}>
          <h2 id="routine">3. La routine qui marche</h2>
          <div className="adm-row" style={{ marginTop: 0 }}>
            <div className="adm-mini"><b>Chaque jour · 10 min</b><span>Ouvre l’<Link href="/admin">Accueil</Link> et fais la liste « À faire » dans l’ordre. Réponds aux propositions. Teste 3 à 5 codes.</span></div>
            <div className="adm-mini"><b>Chaque semaine · 30 min</b><span>Lance le script de recherche, trie les nouveaux codes, regarde les catégories vides dans les <Link href="/admin/stats">Statistiques</Link> et ajoute 2 ou 3 créateurs à suivre.</span></div>
            <div className="adm-mini"><b>Chaque mois · 1 h</b><span>Reteste les codes vérifiés de plus de 30 jours (les offres expirent), compare les indicateurs au mois d’avant, choisis le prochain objectif.</span></div>
          </div>
        </section>

        <section className="adm-tip" aria-labelledby="mots" style={{ marginTop: 24 }}>
          <h2 id="mots">4. Les mots du métier</h2>
          <dl className="adm-glossary">
            <div><dt>Code créateur (ou code influenceur)</dt><dd>Code donné par une marque à un créateur, qui touche une commission quand il est utilisé.</dd></div>
            <div><dt>Affiliation</dt><dd>Le système de commission derrière ces codes. Plus tard, Koupi pourra en toucher aussi.</dd></div>
            <div><dt>Code mort</dt><dd>Code expiré ou désactivé. L’ennemi numéro 1 de la confiance.</dd></div>
            <div><dt>Taux de conversion</dt><dd>Part des visiteurs qui font l’action voulue : copier un code, aller sur l’outil.</dd></div>
          </dl>
        </section>
      </div>
    </main>
  );
}
