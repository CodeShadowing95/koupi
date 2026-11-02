// Contenu des chapitres du guide de l'admin. Le sommaire (titres, ordre, objectifs) est dans lib/admin-guide.ts.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, StatusDot } from '@/components/admin-card';
import { Callout, Demo, Key, Legend, Section, Step, Steps } from '@/components/admin-guide';
import { FLAG_MAX_SUCCESS, FLAG_MIN_VOTES, RETEST_DAYS, TARGETS } from '@/lib/admin-stats';

/** Faux bouton : même apparence que dans l'admin, mais rien ne se passe au clic. */
function Fake({ tone, children }: { tone?: 'pri' | 'ok' | 'no' | 'danger'; children: ReactNode }) {
  return <span className={`adm-btn gd-fake${tone ? ` adm-btn-${tone}` : ''}`}>{children}</span>;
}
function FakeIcon({ icon, tone }: { icon: Parameters<typeof Icon>[0]['name']; tone?: 'ok' | 'bad' }) {
  return <span className={`adm-mini-btn gd-fake${tone ? ` is-${tone}` : ''}`}><Icon name={icon} /></span>;
}

function Introduction() {
  return <>
    <Section id="koupi" title="Koupi en une phrase">
      <p>Koupi réunit les <b>codes promo que les créateurs donnent</b> dans leurs vidéos, podcasts et posts, pour des outils en ligne (VPN, banque, logiciels…). Chaque code est relié à sa source, crédite le créateur qui l’a donné, et il est vérifié.</p>
      <p>Les gros sites de codes promo sont connus pour leurs codes morts. Koupi se distingue par une seule chose : <b>la confiance</b>. Un visiteur doit pouvoir copier un code les yeux fermés.</p>
    </Section>
    <Section id="role" title="Ton rôle d’admin">
      <p>Tu es le gardien du catalogue. Rien n’arrive sur le site public sans passer par toi. Concrètement, tu fais quatre choses :</p>
      <div className="gd-cards">
        <div><b>Modérer</b><span>Tu lis les codes proposés par les visiteurs et tu décides lesquels entrent.</span></div>
        <div><b>Tester</b><span>Tu essaies les codes sur le site de l’outil pour confirmer qu’ils marchent.</span></div>
        <div><b>Ranger</b><span>Tu tiens propres les outils, les créateurs et les catégories.</span></div>
        <div><b>Piloter</b><span>Tu regardes les chiffres pour savoir quoi faire en priorité.</span></div>
      </div>
    </Section>
    <Section id="regle" title="La règle d’or">
      <Callout tone="rule" title="Pas de source, pas de code">
        Un code n’entre dans le catalogue que si tu peux montrer <b>où le créateur l’a donné</b> : une vidéo, un épisode, un post. Le lien de la source est la preuve que le code est public et qu’il vient bien de lui.
      </Callout>
      <p>Deux conséquences simples :</p>
      <ul className="gd-list">
        <li>Une offre officielle de la marque (sur sa propre page) n’est <b>pas</b> un code créateur. On la refuse.</li>
        <li>Un code « trouvé quelque part » sans lien vérifiable reste en attente ou est refusé.</li>
      </ul>
    </Section>
    <Section id="suite" title="Comment lire ce guide">
      <p>Chaque chapitre commence par ce que tu sauras faire, se termine par un bouton pour <b>mettre en pratique</b> dans la vraie page, et tient en quelques minutes. Lis-les dans l’ordre la première fois, puis reviens-y comme à une notice quand tu as un doute.</p>
      <Callout tone="tip">Rien de ce que tu fais dans le guide ne modifie le site. Les boutons montrés en exemple sont des images : tu peux les regarder sans crainte.</Callout>
    </Section>
  </>;
}

function SeReperer() {
  return <>
    <Section id="menu" title="Le menu de gauche">
      <p>Le menu est rangé par grandes tâches, de haut en bas :</p>
      <Legend rows={[
        { term: 'Pilotage', meaning: <><b>Accueil</b> (ce qu’il y a à faire aujourd’hui) et <b>Statistiques</b> (les chiffres en détail).</> },
        { term: 'Modération', meaning: <><b>Propositions</b> (les codes envoyés par les visiteurs) et <b>Codes</b> (tout le catalogue). Un nombre orange à côté veut dire « des éléments t’attendent ».</> },
        { term: 'Catalogue', meaning: <><b>Outils</b>, <b>Créateurs</b> et <b>Catégories</b> : ce qui organise le site.</> },
        { term: 'Apprendre', meaning: 'Ce guide.' },
      ]} />
      <p>En bas du menu, <b>Voir le site</b> ouvre le site public dans un nouvel onglet : pratique pour vérifier ce que voit un visiteur.</p>
    </Section>
    <Section id="recherche" title="Tout trouver avec ⌘K">
      <p>Appuie sur <Key>⌘</Key> <Key>K</Key> sur Mac, ou <Key>Ctrl</Key> <Key>K</Key> sur PC, depuis n’importe quelle page, ou clique sur « Rechercher » en haut. Avant même de taper, la fenêtre te propose tes derniers éléments ouverts (« Récents »), un « Accès rapide » au travail du jour (propositions, codes à tester et à retester, statistiques), les autres pages et les exports. Dès que tu tapes un code, un outil, un créateur ou le nom d’une page, les résultats remplacent ces suggestions, rangés par type, avec les lettres tapées en bleu. Chaque ligne reprend l’icône de sa rubrique dans le menu de gauche, et les exports ont une flèche de téléchargement : tu sais d’un coup d’œil où tu vas arriver.</p>
      <Steps>
        <Step title="Tape quelques lettres">Pas besoin de majuscules ni d’accents : « edi » trouve « Éditeur ».</Step>
        <Step title="Filtre si besoin">Sous le champ, les filtres Tout, Pages, Codes, Outils, Créateurs et Propositions affichent, dès que tu tapes, le nombre de résultats de chaque type. Sans rien taper, choisir un filtre permet de parcourir ce type (par exemple tous les outils). Clique dessus ou appuie sur <Key>Tab</Key> pour passer de l’un à l’autre. Un code affiche aussi son statut à droite.</Step>
        <Step title="Choisis avec les flèches">Les touches <Key>↑</Key> <Key>↓</Key> déplacent la sélection, ou survole un résultat avec la souris. « Voir les … » sous un groupe affiche tous ses résultats.</Step>
        <Step title="Ouvre avec Entrée">La touche <Key>↵</Key> (ou un clic) ouvre la page, déjà filtrée sur ce que tu cherchais. <Key>Échap</Key> ferme la fenêtre.</Step>
      </Steps>
      <Callout tone="tip">C’est le moyen le plus rapide de retrouver un code signalé par un visiteur : tape le code, tu tombes directement dessus.</Callout>
    </Section>
    <Section id="notifications" title="La cloche de notifications">
      <p>En haut à droite, la <b>cloche</b> rassemble ce qui demande ton attention, sans que tu aies à faire le tour des pages. Une pastille orange indique combien de notifications tu n’as pas encore lues.</p>
      <Legend rows={[
        { term: 'Propositions', meaning: <>Chaque <b>nouvelle proposition</b> d’un visiteur, avec le moment où elle est arrivée. <b>Refuser</b> la rejette tout de suite ; <b>Examiner</b> ouvre la file pour la valider.</> },
        { term: 'Signalés', meaning: <>Les <b>codes signalés</b> : les visiteurs votent qu’ils ne marchent pas (marqués d’un « ! » rouge). À tester en priorité.</> },
        { term: 'Rappels', meaning: <>Les codes <b>à tester</b> et <b>à retester</b>.</> },
      ]} />
      <p>Les onglets du haut filtrent par type, avec leur nombre. Un point bleu marque ce qui n’est pas lu : cliquer sur une notification t’amène à l’élément et la marque comme lue, et <b>Tout marquer comme lu</b> les marque toutes. Un rappel ne redevient non lu que si quelque chose change (un nombre de codes différent, par exemple).</p>
      <Callout tone="tip">La cloche te dit quoi faire maintenant ; l’accueil t’explique pourquoi et dans quel ordre.</Callout>
    </Section>
    <Section id="listes" title="Les listes : onglets, recherche, tri">
      <p>Toutes les pages de liste (codes, propositions, outils…) marchent de la même façon. Une fois que tu en connais une, tu les connais toutes.</p>
      <Demo caption="Les onglets filtrent par statut. Le nombre à côté dit combien il y en a.">
        <div className="gd-tabs"><span className="adm-tab" aria-pressed="true">Tous <span className="adm-tab-n">128</span></span><span className="adm-tab">À tester <span className="adm-count-badge">6</span></span><span className="adm-tab">Vérifiés <span className="adm-tab-n">84</span></span></div>
      </Demo>
      <Steps>
        <Step title="Choisis un onglet">Il limite la liste à un statut : « À tester », « Archivés »…</Step>
        <Step title="Tape dans la barre de recherche">Elle cherche dans le code, l’outil, le créateur, la réduction. Pas besoin de majuscules ni d’accents.</Step>
        <Step title="Trie ou filtre par lettre">Le menu de tri (vue Cartes) ou un clic sur un titre de colonne (vue Tableau) range la liste. Un clic : croissant, deux clics : décroissant, trois clics : ordre normal. La barre A–Z garde seulement ce qui commence par une lettre.</Step>
      </Steps>
    </Section>
    <Section id="vues" title="Cartes ou Tableau">
      <p>En haut à droite de chaque liste, deux boutons changent l’affichage. Ton choix est gardé pour toutes les listes.</p>
      <Legend rows={[
        { term: 'Cartes', meaning: 'Plus visuel. Bien pour traiter les éléments un par un.' },
        { term: 'Tableau', meaning: 'Plus dense. Bien pour comparer, trier par colonne et repérer ce qui cloche.' },
      ]} />
      <p>Les longues listes sont coupées en pages. En bas, tu choisis combien d’éléments afficher par page.</p>
    </Section>
    <Section id="exporter" title="Exporter une liste">
      <p>Chaque liste (propositions, codes, outils, créateurs, catégories) a un bouton <b>Exporter</b> en haut à droite. Il ouvre un petit menu avec deux formats :</p>
      <Demo caption="Le bouton Exporter et son menu.">
        <div className="gd-row"><Fake>Exporter ▾</Fake><span className="gd-sep" aria-hidden="true" /><Fake>Excel</Fake><Fake>CSV</Fake></div>
      </Demo>
      <Legend rows={[
        { term: 'Excel (.xlsx)', meaning: 'Le plus pratique : s’ouvre directement dans Excel, Numbers ou Google Sheets, avec l’en-tête figé, des filtres sur chaque colonne et des colonnes à la bonne largeur.' },
        { term: 'CSV (.csv)', meaning: 'Un fichier texte simple, lisible par tous les tableurs et par d’autres outils. À choisir pour importer les données ailleurs.' },
      ]} />
      <p>L’export contient <b>toute la liste</b>, archives comprises, quels que soient les filtres affichés à l’écran. Filtre ensuite dans le tableur.</p>
      <Callout tone="warn" title="Rien de personnel dans les fichiers">Les exports ne contiennent jamais l’e-mail des visiteurs qui ont proposé un code : un fichier peut circuler, il ne doit rien contenir de personnel.</Callout>
      <Callout tone="tip">Tu peux aussi lancer un export depuis la recherche <Key>⌘</Key> <Key>K</Key> : tape « exporter ».</Callout>
    </Section>
    <Section id="panneau" title="Le panneau de détail">
      <p><b>Clique sur une carte</b> (ou sur une ligne du tableau) : un panneau glisse depuis la droite avec toutes les informations, sans quitter la liste. Les formulaires (« Modifier », « Nouveau code »…) s’ouvrent au même endroit, par-dessus.</p>
      <Demo caption="Les petits boutons carrés sont des raccourcis. Survole-les : une bulle dit ce qu’ils font.">
        <div className="gd-row"><FakeIcon icon="check" tone="ok" /><FakeIcon icon="cross" tone="bad" /><FakeIcon icon="edit" /><FakeIcon icon="external" /></div>
      </Demo>
      <p>Pour fermer : la croix, la touche <Key>Échap</Key>, ou un clic à côté du panneau.</p>
    </Section>
    <Section id="theme" title="Clair ou sombre">
      <p>L’admin suit le thème de ton ordinateur. Tu peux le forcer avec le bouton soleil/lune en haut de la page. Le choix est gardé dans ce navigateur.</p>
    </Section>
  </>;
}

function VieDunCode() {
  return <>
    <Section id="statuts" title="Les quatre statuts">
      <p>Chaque code a un statut. Il dit où en est le code et <b>s’il est visible sur le site</b>.</p>
      <div className="adm-steps">
        <div className="adm-step"><b>En attente</b><span>Privé. Il manque une info ou la source n’est pas encore vérifiée.</span></div>
        <div className="adm-step-arrow" aria-hidden="true">→</div>
        <div className="adm-step" data-tone="warn"><b>À tester</b><span>Visible, avec la mention « à tester ». La source est bonne, personne ne l’a encore essayé.</span></div>
        <div className="adm-step-arrow" aria-hidden="true">→</div>
        <div className="adm-step" data-tone="ok"><b>Vérifié</b><span>Visible. Tu l’as essayé toi-même et il marche. C’est la promesse Koupi.</span></div>
      </div>
      <p>À tout moment, un code peut passer en <b>Rejeté</b> : il disparaît du site.</p>
      <Demo caption="Dans les listes, le statut est un point de couleur suivi d’un mot.">
        <div className="gd-row"><StatusDot tone="muted">En attente</StatusDot><StatusDot tone="warn">À tester</StatusDot><StatusDot tone="ok">Vérifié</StatusDot><StatusDot tone="bad">Rejeté</StatusDot></div>
      </Demo>
    </Section>
    <Section id="visible" title="Ce que voit un visiteur">
      <Legend rows={[
        { term: <StatusDot tone="ok">Vérifié</StatusDot>, meaning: 'Affiché en premier, avec le badge vérifié.' },
        { term: <StatusDot tone="warn">À tester</StatusDot>, meaning: 'Affiché, avec la mention « à tester ». Les visiteurs peuvent voter « ça marche » ou « ça ne marche pas ».' },
        { term: <><StatusDot tone="muted">En attente</StatusDot> <StatusDot tone="bad">Rejeté</StatusDot></>, meaning: 'Invisibles. Seul l’admin les voit.' },
      ]} />
      <Callout tone="why">Un outil n’apparaît sur le site que s’il a au moins un code <b>vérifié</b> ou <b>à tester</b>. Sans code visible, sa page n’existe pas pour les visiteurs.</Callout>
    </Section>
    <Section id="rejeter" title="Quand rejeter">
      <p>Rejeter n’est pas un échec : c’est ce qui rend le catalogue fiable. Rejette quand :</p>
      <ul className="gd-list">
        <li>tu as essayé le code et il ne marche pas (expiré, désactivé) ;</li>
        <li>c’est une offre officielle de la marque, pas un code de créateur ;</li>
        <li>on ne sait pas à quel produit il s’applique ;</li>
        <li>la source a disparu et rien ne prouve que le code est public.</li>
      </ul>
      <Callout tone="tip">Un code rejeté n’est pas supprimé. Si le créateur le réactive, tu peux le repasser en « À tester ».</Callout>
    </Section>
  </>;
}

function Propositions() {
  return <>
    <Section id="quoi" title="D’où viennent les propositions">
      <p>Sur le site, n’importe quel visiteur peut proposer un code avec la page <b>Proposer un code</b>. Il donne l’outil, le créateur, le code, la réduction et le lien où il l’a vu. Sa proposition arrive ici, dans l’onglet <b>À traiter</b>, et le nombre à côté de « Propositions » dans le menu augmente.</p>
      <Callout tone="why" title="Pourquoi répondre vite">Un visiteur qui propose un code a fait un effort pour Koupi. Si sa proposition attend une semaine, il ne reviendra pas. Vise moins de {TARGETS.delayHours} heures : c’est l’indicateur « Délai de modération ».</Callout>
    </Section>
    <Section id="verifier" title="Vérifier une proposition, pas à pas">
      <Steps>
        <Step title="Ouvre la proposition">Clique sur la carte. Le panneau montre tout : code, outil, créateur, réduction, commentaire du visiteur.</Step>
        <Step title="Ouvre la source">Clique sur « Ouvrir la source ↗ ». Cherche le code dans la vidéo, sa description ou le post. Il doit y être <b>écrit ou dit à l’identique</b>.</Step>
        <Step title="Vérifie que c’est bien le créateur">La source doit venir du compte du créateur annoncé, pas d’un site de codes qui recopie.</Step>
        <Step title="Décide">Avec l’un des trois boutons ci-dessous.</Step>
      </Steps>
    </Section>
    <Section id="decider" title="Les trois décisions">
      <Demo caption="Les trois boutons d’une proposition à traiter.">
        <div className="gd-row"><Fake tone="pri">Valider…</Fake><Fake>Doublon</Fake><Fake>Refuser</Fake></div>
      </Demo>
      <Legend rows={[
        { term: 'Valider…', meaning: <>Ouvre le formulaire du code, pré-rempli. Corrige ce qui doit l’être (orthographe de l’outil, réduction claire comme « -20 % » ou « 3 mois offerts »), choisis le statut, puis <b>Valider et créer le code</b>. La proposition passe en « Validée » et le code entre dans le catalogue.</> },
        { term: 'Doublon', meaning: 'Le même code existe déjà pour cet outil. Koupi en détecte certains tout seul (onglet « Doublons »), mais pas tous : vérifie avec ⌘K.' },
        { term: 'Refuser', meaning: 'Pas de source, code inventé, offre officielle de la marque, spam. Tu peux écrire une courte note de refus : elle reste dans l’historique.' },
      ]} />
      <Callout tone="tip" title="Quel statut choisir en validant ?">
        Si tu as vu le code dans la source mais pas essayé : <b>À tester</b>. Si tu l’as essayé et qu’il marche : <b>Vérifié</b>. S’il manque une info : <b>En attente</b>, il restera caché.
      </Callout>
    </Section>
    <Section id="outil-inconnu" title="Si l’outil n’existe pas encore">
      <p>Dans le formulaire, la liste « Outil » propose <b>+ Nouvel outil</b>. Donne son nom, sa catégorie et son site officiel : l’outil est créé en même temps que le code.</p>
      <Callout tone="warn">Avant de créer un outil, cherche-le dans la liste avec une autre orthographe (« Nord VPN » ou « NordVPN »). Deux fiches pour le même outil, c’est deux pages à moitié vides.</Callout>
    </Section>
    <Section id="filtres" title="Retrouver une ancienne proposition">
      <p>Les onglets <b>Validées</b>, <b>Refusées</b>, <b>Doublons</b> et <b>Toutes</b> gardent l’historique. Tu peux filtrer par catégorie et par période (dates « Du » et « Au »). Une proposition refusée par erreur se remet en file avec <b>Remettre à traiter</b>.</p>
      <Callout tone="warn" title="Les e-mails des visiteurs">Certains visiteurs laissent leur e-mail. Il sert uniquement à leur répondre : ne le copie nulle part. Les exports (Excel ou CSV) ne le contiennent pas, exprès.</Callout>
    </Section>
  </>;
}

function Codes() {
  return <>
    <Section id="liste" title="La liste des codes">
      <p>C’est tout le catalogue, quel que soit le statut. Les onglets les plus utiles au quotidien :</p>
      <Legend rows={[
        { term: 'À tester', meaning: 'Codes visibles que personne n’a encore essayés. Ta file de travail principale.' },
        { term: 'À retester', meaning: `Codes vérifiés il y a plus de ${RETEST_DAYS} jours, ou jamais testés depuis l’import. Les offres expirent : on les réessaie.` },
        { term: 'En attente', meaning: 'Codes cachés à compléter.' },
        { term: 'Archivés', meaning: 'Codes mis de côté. Le bouton « Restaurer » les fait revenir.' },
      ]} />
    </Section>
    <Section id="tester" title="Tester un code, pas à pas">
      <Steps>
        <Step title="Ouvre le site de l’outil">Depuis le panneau du code, avec le lien de l’outil ou du créateur.</Step>
        <Step title="Va jusqu’au paiement, sans payer">Mets l’offre dans le panier, colle le code dans le champ « code promo ». Tu n’as pas besoin d’aller au bout.</Step>
        <Step title="Regarde si la réduction s’applique">Le prix baisse, ou un message confirme le code : il marche. Un message d’erreur : il ne marche pas.</Step>
        <Step title="Note le résultat">Avec un des deux boutons ci-dessous. La date du test est enregistrée.</Step>
      </Steps>
      <Demo caption="Les deux boutons de test, en carte et en version courte.">
        <div className="gd-row"><Fake tone="ok">✓ Marche</Fake><Fake tone="no">✗ Ne marche pas</Fake><span className="gd-sep" aria-hidden="true" /><FakeIcon icon="check" tone="ok" /><FakeIcon icon="cross" tone="bad" /></div>
      </Demo>
      <Callout tone="warn">Ne paie jamais pour tester, et ne crée pas de compte avec tes données perso si l’outil l’exige : marque le code « À tester » et laisse les votes des visiteurs parler.</Callout>
    </Section>
    <Section id="votes" title="Les votes des visiteurs">
      <p>Sur le site, sous chaque code, les visiteurs peuvent dire « ça marche » ou « ça ne marche pas ». La colonne <b>Réussite</b> montre le pourcentage de « ça marche ».</p>
      <Callout tone="why">Si un code passe sous {FLAG_MAX_SUCCESS} % de réussite avec au moins {FLAG_MIN_VOTES} votes, il remonte dans la liste « À faire » de l’accueil. C’est le signal qu’il faut le retester.</Callout>
    </Section>
    <Section id="ajouter" title="Ajouter ou modifier un code">
      <p>Le bouton <b>Nouveau code</b> ouvre le formulaire. Les champs importants :</p>
      <Legend rows={[
        { term: 'Lien de la source', meaning: 'Obligatoire. La vidéo, l’épisode ou le post où le créateur donne le code.' },
        { term: 'Réduction', meaning: 'Court et concret : « -20 % », « 3 mois offerts », « 50 € offerts ».' },
        { term: 'Lien du créateur', meaning: 'Facultatif. Son lien d’affiliation, ouvert tel quel quand le visiteur clique.' },
        { term: 'Note interne', meaning: 'Pour toi et les autres admins. Jamais affichée sur le site.' },
      ]} />
      <p>Pour corriger un code existant, ouvre-le et clique sur <b>Modifier</b> (ou l’icône crayon).</p>
    </Section>
    <Section id="export" title="Exporter">
      <p><b>Exporter</b> télécharge tous les codes, archives comprises, en Excel ou en CSV. Utile pour un bilan ou pour préparer un message à une marque. Voir <Link href="/admin/guide/se-reperer#exporter">Exporter une liste</Link>.</p>
    </Section>
  </>;
}

function Outils() {
  return <>
    <Section id="quoi" title="Ce qu’est un outil">
      <p>Un outil est un produit en ligne pour lequel on collecte des codes : NordVPN, Qonto, Notion… Chaque outil a une catégorie, un site officiel, une description facultative et une <b>priorité</b>.</p>
      <Callout tone="why">Un outil apparaît sur le site dès qu’il a un code vérifié ou à tester. L’onglet <b>Sans code visible</b> liste les outils suivis mais encore invisibles : c’est ta liste de chasse.</Callout>
    </Section>
    <Section id="ajouter" title="Ajouter un outil">
      <Steps>
        <Step title="Vérifie qu’il n’existe pas déjà">Tape son nom dans la recherche, avec et sans espace.</Step>
        <Step title="Clique sur « Nouvel outil »">Donne son nom exact, tel que la marque l’écrit.</Step>
        <Step title="Choisis la catégorie">Le menu se filtre quand tu tapes. Si aucune ne convient, crée-la d’abord dans Catégories.</Step>
        <Step title="Site officiel">Le domaine suffit : « exemple.com ». Il sert au logo et au lien.</Step>
        <Step title="Description (facultative)">Une phrase pour la fiche. Vide, le site écrit « Les codes promo donnés par les créateurs pour … ».</Step>
      </Steps>
    </Section>
    <Section id="priorite" title="La priorité, de 1 à 5">
      <p>La priorité dit <b>quels outils couvrir en premier</b>. Elle classe les outils dans l’admin et sur le site.</p>
      <Legend rows={[
        { term: <span className="adm-prio">P1</span>, meaning: 'À couvrir en premier : outil très recherché, beaucoup de créateurs en parlent.' },
        { term: <span className="adm-prio">P3</span>, meaning: 'Normal. C’est la valeur par défaut.' },
        { term: <span className="adm-prio">P5</span>, meaning: 'Peut attendre.' },
      ]} />
      <Callout tone="tip">Trie la liste par priorité, puis regarde l’onglet « Sans code visible » : les P1 sans code sont ce qu’il faut chercher cette semaine.</Callout>
    </Section>
    <Section id="archiver" title="Archiver plutôt que supprimer">
      <p>Un outil fermé ou hors sujet s’<b>archive</b> depuis son panneau. Il disparaît du site avec ses codes, mais rien n’est perdu : l’onglet <b>Archivés</b> permet de le <b>restaurer</b>.</p>
      <Callout tone="warn">On ne supprime jamais un outil : il serait réimporté au prochain déploiement. L’archive est la bonne façon de le retirer.</Callout>
    </Section>
    <Section id="exporter" title="Exporter les outils">
      <p><b>Exporter</b> donne la liste complète en Excel ou en CSV : catégorie, site, priorité, nombre de codes, présence sur le site. Pratique pour trier les P1 sans code dans un tableur et se faire une liste de chasse.</p>
    </Section>
  </>;
}

function Createurs() {
  return <>
    <Section id="quoi" title="Ce qu’est un créateur pour Koupi">
      <p>Un créateur est la chaîne, le podcast ou le compte qui donne un code. Il est crédité sur chaque code et a sa page publique avec tous ses codes. Les créateurs sont créés automatiquement quand tu enregistres un code avec un nouveau nom.</p>
      <Legend rows={[
        { term: 'Sur le site', meaning: 'A au moins un code visible : sa page publique existe.' },
        { term: 'Sans code visible', meaning: 'Tous ses codes sont en attente ou rejetés : il n’apparaît pas encore.' },
      ]} />
    </Section>
    <Section id="fiche" title="Lire la fiche d’un créateur">
      <p>Clique sur un créateur : le panneau montre son nombre de codes, les <b>outils qu’il recommande</b> et le lien vers sa page publique. <b>Voir ses codes</b> ouvre la liste des codes filtrée sur lui.</p>
      <Callout tone="tip">Un créateur qui recommande déjà trois outils en a souvent d’autres. Regarde ses dernières vidéos : c’est la façon la plus rapide de trouver de nouveaux codes.</Callout>
    </Section>
    <Section id="noms" title="Garder des noms propres">
      <p>Les majuscules ne comptent pas, mais « Le Grand JD » et « LeGrandJD » font deux créateurs différents, avec deux pages à moitié vides. Utilise toujours le nom exact de la chaîne et choisis-le dans la liste proposée quand tu tapes.</p>
      <p>Si un nom est mal écrit, <b>Renommer</b> le corrige partout d’un coup, sur tous ses codes.</p>
      <Callout tone="warn">Renommer change le nom affiché sur le site. Vérifie l’orthographe sur la chaîne du créateur avant de valider.</Callout>
    </Section>
    <Section id="exporter" title="Exporter les créateurs">
      <p><b>Exporter</b> donne tous les créateurs en Excel ou en CSV, avec leurs codes et les outils qu’ils recommandent. Utile pour préparer une prise de contact ou repérer ceux à suivre.</p>
    </Section>
  </>;
}

function Categories() {
  return <>
    <Section id="quoi" title="Les rayons du site">
      <p>Les catégories sont les rayons du site : VPN, Banque, Productivité… Chaque outil appartient à une catégorie. Les visiteurs les parcourent pour découvrir des outils.</p>
    </Section>
    <Section id="couverture" title="La couverture d’une catégorie">
      <p>Sur chaque carte, un pourcentage : c’est la part des outils de la catégorie qui ont <b>au moins un code visible</b>.</p>
      <Demo caption="Une catégorie couverte à 60 %, et une catégorie vide.">
        <div className="gd-row"><StatusDot tone="ok">60 %</StatusDot><StatusDot tone="muted">Vide</StatusDot></div>
      </Demo>
      <Callout tone="why">Une catégorie « Vide » n’a aucun outil visible : un visiteur qui l’ouvre ne trouve rien. L’onglet <b>Vides sur le site</b> les liste. Remplis-les en priorité ou ne les mets pas en avant.</Callout>
      <p><b>Voir les outils</b> ouvre la liste des outils filtrée sur la catégorie, pour repérer ceux qui manquent de codes.</p>
    </Section>
    <Section id="gerer" title="Créer et renommer">
      <p><b>Nouvelle catégorie</b> en crée une ; <b>Renommer</b> change son nom partout. Garde des noms courts, au pluriel quand c’est naturel, compréhensibles par tout le monde (« Banques en ligne » plutôt que « Néobanques »).</p>
      <Callout tone="tip">Moins de catégories bien remplies valent mieux que beaucoup de catégories vides.</Callout>
    </Section>
    <Section id="exporter" title="Exporter les catégories">
      <p><b>Exporter</b> donne chaque catégorie avec son nombre d’outils, ceux qui ont un code visible et sa couverture en pourcentage, en Excel ou en CSV.</p>
    </Section>
  </>;
}

function Indicateurs() {
  return <>
    <Section id="pourquoi" title="Pourquoi des chiffres">
      <p>Les chiffres te disent <b>quoi faire en premier</b>. Tu n’as pas besoin de tout surveiller : quatre indicateurs suffisent, affichés sur l’accueil et détaillés dans Statistiques.</p>
    </Section>
    <Section id="quatre" title="Les quatre indicateurs clés">
      <div className="adm-row adm-row-2" style={{ marginTop: 0 }}>
        <article className="adm-panel">
          <h3 className="gd-h3">Couverture du catalogue</h3>
          <span className="adm-formula">outils avec un code visible ÷ outils suivis</span>
          <p className="gd-small">Un visiteur cherche un outil précis : sans code, il repart. <b>Bon niveau</b> : {TARGETS.coverage} % au lancement, 80 % ensuite. <b>Pour le faire monter</b> : traite les codes en attente, puis cherche des codes pour les outils P1 sans code.</p>
        </article>
        <article className="adm-panel">
          <h3 className="gd-h3">Codes vérifiés</h3>
          <span className="adm-formula">codes vérifiés ÷ codes visibles</span>
          <p className="gd-small">La confiance, ce qui distingue Koupi. <b>Bon niveau</b> : plus de {TARGETS.verified} %. <b>Pour le faire monter</b> : 10 minutes de tests par jour dans l’onglet « À tester ».</p>
        </article>
        <article className="adm-panel">
          <h3 className="gd-h3">Réussite déclarée</h3>
          <span className="adm-formula">votes « ça marche » ÷ tous les votes</span>
          <p className="gd-small">Ce que vivent les visiteurs. <b>Bon niveau</b> : {TARGETS.success} % et plus. <b>Pour le faire monter</b> : reteste les codes signalés dans « À faire » et rejette ceux qui sont morts.</p>
        </article>
        <article className="adm-panel">
          <h3 className="gd-h3">Délai de modération</h3>
          <span className="adm-formula">médiane (décision − réception), 30 derniers jours</span>
          <p className="gd-small">Le temps qu’attend un visiteur qui propose un code. <b>Bon niveau</b> : moins de {TARGETS.delayHours} h. <b>Pour le faire baisser</b> : passe sur Propositions une fois par jour, même 2 minutes.</p>
        </article>
      </div>
      <Callout tone="tip" title="Le mot « médiane »">La médiane est la valeur du milieu : la moitié des propositions ont été traitées plus vite, l’autre moitié plus lentement. Elle n’est pas faussée par une seule proposition oubliée.</Callout>
    </Section>
    <Section id="a-faire" title="La liste « À faire »">
      <p>Sur l’accueil, « À faire maintenant » est classée <b>par impact</b> : en haut, ce qui fait le plus de bien au catalogue. Fais-la de haut en bas, chaque lien ouvre la bonne liste déjà filtrée.</p>
    </Section>
    <Section id="audience" title="L’audience">
      <p>Les statistiques d’audience (codes copiés, liens ouverts, recherches sans résultat) sont comptées <b>sans pistage</b> : de simples compteurs anonymes, aucun cookie publicitaire. C’est une promesse du site.</p>
      <Legend rows={[
        { term: 'Codes copiés', meaning: 'Le geste clé : un visiteur a trouvé ce qu’il cherchait.' },
        { term: 'Liens ouverts', meaning: 'Vers le créateur ou l’outil. C’est ce que tu montreras plus tard aux marques.' },
        { term: 'Recherches sans résultat', meaning: 'Les outils que les gens cherchent et que Koupi n’a pas. La meilleure liste des prochains outils à ajouter.' },
      ]} />
    </Section>
  </>;
}

function Routine() {
  return <>
    <Section id="routine" title="La routine qui marche">
      <div className="adm-row" style={{ marginTop: 0 }}>
        <div className="adm-mini"><b>Chaque jour · 10 min</b><span>Ouvre l’<Link href="/admin">Accueil</Link> et fais « À faire » dans l’ordre. Réponds aux <Link href="/admin/propositions">propositions</Link>. Teste 3 à 5 codes.</span></div>
        <div className="adm-mini"><b>Chaque semaine · 30 min</b><span>Cherche des codes pour les outils P1 sans code, regarde les catégories vides dans les <Link href="/admin/stats">Statistiques</Link>, ajoute 2 ou 3 créateurs à suivre.</span></div>
        <div className="adm-mini"><b>Chaque mois · 1 h</b><span>Reteste les codes de l’onglet <Link href="/admin/codes?status=retest">À retester</Link>, lis les <Link href="/admin/stats#audience">recherches sans résultat</Link>, compare les indicateurs au mois d’avant et choisis un objectif.</span></div>
      </div>
      <Callout tone="tip">Mieux vaut 10 minutes chaque jour qu’une heure le dimanche : les visiteurs qui proposent un code attendent une réponse rapide.</Callout>
    </Section>
    <Section id="mots" title="Les mots du métier">
      <dl className="gd-glossary">
        <div><dt>Code créateur (ou code influenceur)</dt><dd>Code donné par une marque à un créateur, qui touche une commission quand il est utilisé.</dd></div>
        <div><dt>Affiliation</dt><dd>Le système de commission derrière ces codes. Plus tard, Koupi pourra en toucher aussi.</dd></div>
        <div><dt>Lien d’affiliation</dt><dd>Lien propre au créateur : la marque sait que le visiteur vient de lui.</dd></div>
        <div><dt>Source</dt><dd>La vidéo, l’épisode ou le post où le créateur donne le code. La preuve.</dd></div>
        <div><dt>Code mort</dt><dd>Code expiré ou désactivé. L’ennemi numéro 1 de la confiance.</dd></div>
        <div><dt>Doublon</dt><dd>Le même code, pour le même outil, déjà dans le catalogue.</dd></div>
        <div><dt>Couverture</dt><dd>Part des outils qui ont au moins un code visible.</dd></div>
        <div><dt>Taux de conversion</dt><dd>Part des visiteurs qui font l’action voulue : copier un code, aller sur l’outil.</dd></div>
        <div><dt>Modération</dt><dd>Décider ce qui est publié et ce qui ne l’est pas.</dd></div>
        <div><dt>B2B</dt><dd>« Business to business » : l’offre future de Koupi pour les marques.</dd></div>
      </dl>
    </Section>
  </>;
}

export const chapterContent: Record<string, () => ReactNode> = {
  introduction: Introduction,
  'se-reperer': SeReperer,
  'vie-d-un-code': VieDunCode,
  propositions: Propositions,
  codes: Codes,
  outils: Outils,
  createurs: Createurs,
  categories: Categories,
  indicateurs: Indicateurs,
  routine: Routine,
};
