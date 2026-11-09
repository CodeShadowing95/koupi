// Contenu des chapitres du guide de l'admin. Le sommaire (titres, ordre, objectifs) est dans lib/admin-guide.ts.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, StatusDot } from '@/components/admin-card';
import { Callout, Demo, Key, Legend, Section, Step, Steps } from '@/components/admin-guide';
import { FLAG_MAX_SUCCESS, FLAG_MIN_VOTES, RETEST_DAYS, TARGETS } from '@/lib/admin-stats';
import { CLEAR_SCORE, CREATOR_LEVEL_LABELS, MIN_RATINGS, MIN_SUBSCRIBERS, REJECT_BELOW } from '@/lib/verification';
import { FIRST_READ_DAYS } from '@/lib/podcast-read';
import { ADMIN_EXPIRY_DAYS } from '@/lib/code-expiry';
import { SITE_PAGES } from '@/lib/site-pages';

/** Faux bouton : même apparence que dans l'admin, mais rien ne se passe au clic. */
function Fake({ tone, children }: { tone?: 'pri' | 'ok' | 'no' | 'danger'; children: ReactNode }) {
  return <span className={`adm-btn gd-fake${tone ? ` adm-btn-${tone}` : ''}`}>{children}</span>;
}
function FakeIcon({ icon, tone }: { icon: Parameters<typeof Icon>[0]['name']; tone?: 'ok' | 'bad' }) {
  return <span className={`adm-mini-btn gd-fake${tone ? ` is-${tone}` : ''}`}><Icon name={icon} /></span>;
}

function Introduction() {
  return <>
    <Section id="koupi" title="Merkod en une phrase">
      <p>Merkod réunit les <b>codes promo que les créateurs donnent</b> dans leurs vidéos, podcasts et posts, pour des outils en ligne (VPN, banque, logiciels…). Chaque code est relié à sa source, crédite le créateur qui l’a donné, et il est vérifié.</p>
      <p>Les gros sites de codes promo sont connus pour leurs codes morts. Merkod se distingue par une seule chose : <b>la confiance</b>. Un visiteur doit pouvoir copier un code les yeux fermés.</p>
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
        { term: 'Pilotage', meaning: <><b>Accueil</b> (ce qu’il y a à faire aujourd’hui), <b>Statistiques</b> (les chiffres en détail, en quatre onglets, dont <b>Consommation</b> : le quota YouTube et la dépense IA, et <b>Vitesse</b> : la vitesse ressentie par les visiteurs) et <b>Retours</b> (les avis des visiteurs).</> },
        { term: 'Catalogue', meaning: <><b>Codes</b> (tout le catalogue), avec en sous-menus <b>Propositions</b> (les codes envoyés par les visiteurs), <b>Vérifications</b> (les dossiers préparés avec un score), <b>Sources</b> (d’où viennent les codes, ce qu’elles rapportent et coûtent) et <b>Podcasts suivis</b>. Puis <b>Créateurs</b> (avec <b>Demandes</b>) et <b>Outils</b> (avec <b>Outils à ajouter</b> et <b>Catégories</b>).</> },
        { term: 'Aide et réglages', meaning: <>Ce <b>guide</b> et l’espace <b>Administration</b>.</> },
      ]} />
      <p>Un clic sur le nom ouvre la page. La <b>flèche</b> à droite déplie ses sous-menus ; ils restent ouverts quand tu es sur l’une de leurs pages. Un nombre orange veut dire « des éléments t’attendent » : codes à tester (Codes), propositions à valider, codes en attente de ta décision (Vérifications), outils à ajouter, nouveaux podcasts candidats, avis et demandes. Il se met à jour dès qu’une analyse, une lecture ou une recherche apporte du nouveau. Menu replié, un <b>point orange</b> près de la flèche dit qu’un sous-menu en a. <b>Voir le site</b> et <b>Se déconnecter</b> restent toujours en bas, sans défiler.</p>
      <p>Juste au-dessus, la jauge de <b>consommation</b> montre sur deux lignes le quota YouTube du jour et le plafond IA du mois ; elle passe à l’orange à 70 %, au rouge à 90 %, et se met à jour chaque minute. Un clic ouvre l’onglet Consommation de Statistiques.</p>
      <p>Chaque page porte son nom dans l’onglet du navigateur (« Codes · Admin Merkod ») : tu reconnais tes onglets d’un coup d’œil. Le petit titre au-dessus du nom de la page reprend le groupe du menu (Pilotage, Catalogue).</p>
      <p>En haut des listes (Propositions, Codes, Vérifications, Outils, Créateurs, Demandes, Retours), <b>Actualiser</b> relit la liste sans recharger la page ni perdre tes filtres.</p>
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
        { term: 'Messages', meaning: <>Les <b>demandes des créateurs</b> à traiter (« C’est ma page », « Page incorrecte ») et les <b>avis des visiteurs</b> pas encore lus, les 5 plus récents de chaque. Ils mènent à <Link href="/admin/createurs/demandes">Demandes</Link> et à <Link href="/admin/retours">Retours</Link>. Dans le menu, <b>Demandes</b> et <b>Retours</b> portent aussi une pastille avec leur nombre.</> },
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
      <p>Avant une action qui retire ou coupe quelque chose (archiver, retirer un compte, mettre le site en pause…), une petite fenêtre te demande de confirmer : la question en titre, ce qui va se passer dessous. Le bouton <b>rouge</b> signale ce qui retire quelque chose ; <b>Annuler</b> ou <Key>Échap</Key> ne change rien.</p>
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
        <div className="adm-step" data-tone="ok"><b>Vérifié</b><span>Visible. Tu l’as essayé toi-même et il marche. C’est la promesse Merkod.</span></div>
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
      <p>Sur le site, n’importe quel visiteur peut proposer un code avec la page <b>Proposer un code</b>. Il donne l’outil, le créateur, le code, la réduction si elle est annoncée et le lien où il l’a vu. Pour une vidéo YouTube, il peut coller le lien : Merkod lit la vidéo (1 unité du quota YouTube) et remplit le nom exact de la chaîne et les codes repérés dans la description, sans IA ; le visiteur coche et corrige avant d’envoyer. Sans réduction, la proposition porte « Offre du créateur » : corrige-la à la validation si tu trouves mieux. Si le même code vaut pour plusieurs outils, tu reçois une proposition par outil, à valider une à une. Sa proposition arrive ici, dans l’onglet <b>À traiter</b>, et le nombre à côté de « Propositions » dans le menu augmente.</p>
      <Callout tone="why" title="Pourquoi répondre vite">Un visiteur qui propose un code a fait un effort pour Merkod. Si sa proposition attend une semaine, il ne reviendra pas. Vise moins de {TARGETS.delayHours} heures : c’est l’indicateur « Délai de modération ».</Callout>
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
        { term: 'Doublon', meaning: 'Le même code existe déjà pour cet outil. Merkod range tout seul dans l’onglet « Doublons » une proposition déjà envoyée ou déjà au catalogue, casse ignorée. Pour une proposition plus ancienne, le formulaire de validation te prévient et refuse de créer le code une deuxième fois.' },
        { term: 'Refuser', meaning: 'Pas de source, code inventé, offre officielle de la marque, spam. Une fenêtre te propose d’écrire une courte note de refus (facultative) : elle reste dans l’historique. Annuler ne refuse pas la proposition.' },
      ]} />
      <Callout tone="tip" title="Quel statut choisir en validant ?">
        Si tu as vu le code dans la source mais pas essayé : <b>À tester</b>. Si tu l’as essayé et qu’il marche : <b>Vérifié</b>. S’il manque une info : <b>En attente</b>, il restera caché.
      </Callout>
    </Section>
    <Section id="outil-inconnu" title="Si l’outil n’existe pas encore">
      <p>Dans le formulaire, la liste « Outil » propose <b>+ Nouvel outil</b>. Donne son nom, sa catégorie et son site officiel : l’outil est créé en même temps que le code. Si le visiteur a choisi une catégorie, elle est déjà remplie ; sinon, choisis-la toi-même ou clique sur <b>✦ Trouver la catégorie</b> : l’IA lit le site officiel, choisit la catégorie (ou propose d’en créer une) et corrige l’orthographe du nom. Si le site appartient déjà à un outil du catalogue, un avertissement l’indique, avec <b>Le choisir</b> pour rattacher le code à cet outil. Son commentaire est repris dans la note interne.</p>
      <Callout tone="warn">Avant de créer un outil, cherche-le dans la liste avec une autre orthographe (« Nord VPN » ou « NordVPN »). Deux fiches pour le même outil, c’est deux pages à moitié vides.</Callout>
    </Section>
    <Section id="filtres" title="Retrouver une ancienne proposition">
      <p>Chaque onglet affiche son nombre de propositions, pour la catégorie et la période choisies. Les onglets <b>Validées</b>, <b>Refusées</b>, <b>Doublons</b> et <b>Toutes</b> gardent l’historique. Tu peux filtrer par catégorie et par période (dates « Du » et « Au »). Une proposition refusée par erreur se remet en file avec <b>Remettre à traiter</b>.</p>
      <Callout tone="warn" title="Les e-mails des visiteurs">Certains visiteurs laissent leur e-mail. Il sert uniquement à leur répondre : ne le copie nulle part. Les exports (Excel ou CSV) ne le contiennent pas, exprès.</Callout>
    </Section>
    <Section id="retours" title="Les retours des visiteurs">
      <p>À côté des codes, les visiteurs peuvent donner leur avis sur la page <b>Ton avis</b> (lien dans le menu et le pied de page du site) : une <b>remarque</b>, une <b>idée</b> ou un <b>problème</b>. Ils arrivent dans <b>Retours</b>, et le nombre à côté dans le menu compte ceux que tu n’as pas encore lus.</p>
      <Steps>
        <Step title="Lis-le">Le lien « Depuis… » montre la page où était le visiteur juste avant : pratique pour comprendre un problème. <b>Marquer lu</b> le sort des nouveaux.</Step>
        <Step title="Réponds si tu peux">Quand une adresse est donnée, <b>Répondre par e-mail</b> ouvre ta messagerie. Un merci rapide donne envie de revenir.</Step>
        <Step title="Range-le">Une note pour toi (« prévu après les alertes »), puis <b>Marquer traité</b>. <b>Rouvrir</b> le remet dans les nouveaux.</Step>
      </Steps>
      <Callout tone="tip">Les problèmes d’abord : un code refusé au paiement ou un bouton qui ne marche pas coûte des visiteurs chaque jour. Le filtre <b>Problème</b> les isole.</Callout>
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
        { term: 'Expire bientôt', meaning: `Codes dont la date de fin tombe dans les ${ADMIN_EXPIRY_DAYS} jours. Cherche s’il y a un nouveau code pour le remplacer à temps.` },
        { term: 'Expirés', meaning: 'La date de fin est passée : rejette le code, ou corrige la date si l’offre a été prolongée.' },
        { term: 'Archivés', meaning: 'Codes mis de côté. Le bouton « Restaurer » les fait revenir.' },
      ]} />
      <p>La colonne <b>Copies</b> (et la même mention sur les cartes et dans le panneau) dit combien de fois les visiteurs ont copié le code depuis le 1er du mois. Trie dessus : les codes les plus copiés sont ceux à retester en premier, et ceux à remplacer d’abord quand ils expirent. Le panneau d’un code range ses informations en trois blocs : le code, sa source, ses tests et ses dates.</p>
      <Callout tone="tip">Pour décider vite des codes en attente et à tester, la page <Link href="/admin/verifications">Vérifications</Link> prépare chaque dossier avec un score et la preuve trouvée dans la source. Voir <Link href="/admin/guide/verifications">Vérifier avec l’aide de l’IA</Link>.</Callout>
      <p><b>Origine</b> : chaque code dit comment Merkod l’a trouvé (saisi à la main, proposition d’un visiteur, import initial, recherche YouTube, podcast suivi). La liste « Toutes les origines » filtre la page, le panneau l’affiche dans « Trouvé par » et Vérifications le rappelle sous chaque dossier. Les codes plus anciens dont on ne sait pas d’où ils viennent sont marqués « Inconnue ».</p>
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
      <Callout tone="why">Si un code passe sous {FLAG_MAX_SUCCESS} % de réussite avec au moins {FLAG_MIN_VOTES} votes, il remonte dans la liste « À faire » de l’accueil. C’est le signal qu’il faut le retester. Une fois testé, clique sur <b>✓ Marche</b> dans Codes (ou <b>Testé au paiement</b>) : la ligne disparaît pour {RETEST_DAYS} jours, ton test compte plus que les votes d’avant.</Callout>
    </Section>
    <Section id="ajouter" title="Ajouter ou modifier un code">
      <p>Le bouton <b>Nouveau code</b> ouvre le formulaire. Les champs importants :</p>
      <Legend rows={[
        { term: 'Code', meaning: 'Lettres, chiffres, tirets et tirets bas, sans espace, avec au plus un % collé à la fin (« SOLARFLOWTECH5% »), 40 caractères au plus. Il est rangé en majuscules : « merci20 » devient « MERCI20 ». Si l’outil a déjà ce code, même archivé, le formulaire te prévient avec un lien et refuse d’en créer un deuxième.' },
        { term: 'Lien de la source', meaning: 'Obligatoire. La vidéo, l’épisode ou le post où le créateur donne le code.' },
        { term: 'Réduction', meaning: 'Court et concret : « -20 % », « 3 mois offerts », « 50 € offerts ».' },
        { term: 'Lien de l’offre', meaning: 'Le lien d’affiliation du créateur, ouvert tel quel quand le visiteur clique. Facultatif avec un code, obligatoire sans.' },
        { term: 'Valable jusqu’au', meaning: 'Facultatif. Seulement si le créateur donne une date de fin (« jusqu’au 31/12 »). Le site l’affiche, et prévient quand elle approche. La plupart des codes n’en ont pas : laisse vide.' },
        { term: 'Note interne', meaning: 'Pour toi et les autres admins. Jamais affichée sur le site.' },
      ]} />
      <p>Pour corriger un code existant, ouvre-le et clique sur <b>Modifier</b> (ou l’icône crayon).</p>
      <Callout tone="tip">Offre sans code : certains créateurs donnent seulement un lien (« KrispCall : try.krispcall.com/tad »). Laisse le champ <b>Code</b> vide et remplis <b>Lien de l’offre</b>. Dans les listes, l’offre porte l’étiquette <b>Lien seul</b>. Sur le site, son coupon a un bouton « Profiter de l’offre » au lieu de « Copier ». Dans Vérifications, elle est prouvée quand son lien est dans la source. Comme il n’y a rien à copier, sa colonne <b>Copies</b> compte les clics sur son lien (pareil dans l’espace créateur et l’annuaire des créateurs).</Callout>
    </Section>
    <Section id="export" title="Exporter">
      <p><b>Exporter</b> télécharge tous les codes, archives comprises, en Excel ou en CSV. Utile pour un bilan ou pour préparer un message à une marque. Voir <Link href="/admin/guide/se-reperer#exporter">Exporter une liste</Link>.</p>
    </Section>
  </>;
}

function Verifications() {
  return <>
    <Section id="pourquoi" title="Pourquoi cette page">
      <p>Quand les codes arrivent par dizaines, tout ouvrir à la main prend des heures. La page <b>Vérifications</b> prépare chaque dossier pour toi : Merkod lit la source, fait les contrôles et calcule un <b>score de confiance sur 100</b>. Tu n’as plus qu’à décider.</p>
      <Callout tone="rule">Merkod propose, tu décides. Aucun code n’est publié ni rejeté sans ton clic.</Callout>
    </Section>
    <Section id="analyse" title="Ce que fait une analyse">
      <Steps>
        <Step title="Lire la source">Pour une vidéo YouTube, Merkod récupère sa description par l’API officielle ; pour un épisode de podcast, ses notes dans Apple Podcasts. Les autres plateformes viendront ensuite : en attendant, ouvre la source toi-même.</Step>
        <Step title="Chercher le code">Le code doit figurer <b>mot pour mot</b> dans la description. Si oui, l’extrait apparaît avec le code surligné : c’est ta preuve.</Step>
        <Step title="Faire les contrôles">Source en ligne, doublon, signes de spam, votes des visiteurs, et <b>niveau du créateur</b> : +15 s’il est « Contrôlé par Merkod », +20 s’il est vérifié. Le niveau se règle dans <Link href="/admin/createurs">Créateurs</Link>.</Step>
        <Step title="Repérer la date de fin">Si la description donne une date (« jusqu’au 31/12 ») et que le code n’en a pas, l’IA remplit le champ <b>Valable jusqu’au</b>. Tu peux la corriger dans Codes.</Step>
        <Step title="Repérer le lien de l’offre">Seulement quand l’option <b>Liens d’affiliation</b> est allumée dans <Link href="/admin/administration">Administration</Link>. Si le créateur donne un lien pour profiter de l’offre (« -20 % avec try.krispcall.com/tad ») et que le code n’en a pas, l’IA remplit <b>Lien de l’offre</b>. Une offre donnée seulement par un lien, sans code, est relevée elle aussi, mais seulement si le lien est écrit dans la description avec une réduction annoncée. Les liens vers les réseaux du créateur (sa chaîne, son Instagram, son Discord…) sont toujours écartés.</Step>
        <Step title="Ajouter les autres codes de la source">Une description donne souvent plusieurs codes, un par outil. Ceux des outils du catalogue qui ne sont pas encore chez nous arrivent <b>En attente</b> dans cette page (pas encore analysés), ceux des outils absents vont dans <b>Outils à ajouter</b>. Une ligne de la carte le dit. Un autre code pour le <b>même</b> outil n’est pas ajouté : c’est sans doute le bon, reprends-le avec le crayon.</Step>
        <Step title="Calculer le score">Chaque contrôle ajoute ou retire des points. Les raisons sont listées sous l’extrait, avec leurs points.</Step>
      </Steps>
      <Callout tone="rule">Vidéo « compilation » : une chaîne liste les codes d’autres créateurs (« 2. Saily — code NOZMAN (Dr Nozman) »). Chaque code est alors crédité au <b>créateur nommé</b>, pas à la chaîne qui fait la liste. Merkod le cherche d’abord parmi les créateurs, puis par sa chaîne YouTube (100 unités du quota, une fois par nom inconnu) ; sans chaîne qui porte ce nom, il le crée par son nom. La note du code commence par « Repris d’une compilation » et son dossier n’est jamais « clair » : la vidéo n’est pas celle du créateur, vérifie le code chez lui avant de le valider.</Callout>
      <Callout tone="rule">Revendeur d’accès partagés : une vidéo qui vend un outil payant « moins cher » par un <b>group buy</b> ou un compte partagé donne le code du revendeur (« Rankerfox, code JULIEN20 » pour Envato Elements), pas une réduction de l’outil. L’IA ne relève plus ces codes, et quand la source parle de group buy ou de compte partagé, le dossier n’est jamais « clair ». De même, quand l’IA rattache le code à une autre marque que son outil, le dossier passe « À regarder » et la raison nomme cette marque : rejette le code, ou choisis le bon outil dans <b>Rattacher à</b> (déjà sélectionné quand la marque est au catalogue) puis clique sur <b>Rattacher</b>. Le code change d’outil et le dossier est réanalysé ; <b>Valider</b> seul le garderait sur l’outil d’origine.</Callout>
      <p>Le bouton <b>Analyser</b> lance l’analyse d’un code ; <b>Analyser les codes non analysés</b> les fait tous, l’un après l’autre.</p>
      <p><b>Une file par univers.</b> Quand la file contient des codes de plusieurs univers, une rangée d’onglets s’affiche au-dessus des verdicts : <b>Tous les univers</b>, <b>Outils en ligne</b>, <b>Mode</b>… Choisis un univers pour ne traiter que ses codes : les verdicts, la recherche et <b>Analyser les codes non analysés</b> ne portent alors que sur lui. Un univers marqué <b>(caché)</b> n’est pas sur le site : commence par <b>Outils en ligne</b>, ce sont les codes que tes visiteurs voient. Sur chaque dossier, l’univers est écrit à côté de l’outil quand ce n’est pas un outil en ligne.</p>
    </Section>
    <Section id="score" title="Lire le score">
      <Legend rows={[
        { term: <StatusDot tone="ok">Dossier clair</StatusDot>, meaning: `${CLEAR_SCORE} et plus. La preuve est là : un coup d’œil à l’extrait et tu valides.` },
        { term: <StatusDot tone="warn">À regarder</StatusDot>, meaning: `De ${REJECT_BELOW} à ${CLEAR_SCORE - 1}. Il manque quelque chose : ouvre la source avant de décider.` },
        { term: <StatusDot tone="bad">Rejet proposé</StatusDot>, meaning: `Moins de ${REJECT_BELOW}. Source disparue, code absent ou spam. Vérifie quand même avant de rejeter.` },
        { term: <StatusDot tone="muted">Pas analysé</StatusDot>, meaning: 'Aucune analyse pour l’instant. Lance-la.' },
      ]} />
      <p>La file met devant les dossiers analysés, du plus sûr au moins sûr : tu valides vite ce qui est clair, puis tu prends le temps sur le reste.</p>
      <p>Tout code part de 30 points (la ligne « Point de départ »), et la somme des lignes donne le score. Un code qui n’est qu’un nombre (« 2026 »), qui ressemble à une clé de licence ou qui n’est que le nom de l’outil (« LWS » pour LWS) perd 50 points : il n’est jamais classé clair. Quand l’IA lit la source sans y voir ce code, il perd encore 20 points, et au moins assez pour ne plus être « clair » : un dossier où l’IA n’est pas d’accord se regarde toujours de près. Un mot collé à un minutage du sommaire (« Cowork13:18 ») ou pris dans une adresse e-mail (« wesroth@… ») ne compte pas comme le code écrit dans la source.</p>
    </Section>
    <Section id="decider" title="Tes trois décisions">
      <Legend rows={[
        { term: <Fake tone="pri">✓ Valider</Fake>, meaning: <>La <b>source est vérifiée</b> : le code est bien donné par ce créateur. Le code passe en « Vérifié ».</> },
        { term: <Fake tone="ok">Testé au paiement</Fake>, meaning: <>Tu as en plus essayé le code jusqu’à la page de paiement et la réduction s’applique. Le code est vérifié et garde la date de ce test.</> },
        { term: <Fake tone="no">✗ Rejeter</Fake>, meaning: 'Le code est faux, mort ou ne vient pas du créateur. Il quitte le site.' },
      ]} />
      <Callout tone="why">« Vérifié » (la source est vérifiée) prouve que le code existe vraiment. « Testé au paiement » prouve qu’il marche aujourd’hui. Les deux rassurent le visiteur, mais pas de la même façon.</Callout>
    </Section>
    <Section id="corriger" title="Corriger un code mal repéré">
      <p>Le repérage automatique peut prendre le mauvais mot : dans « Code promo LWS : CQ410 », le vrai code est CQ410. Quand l’IA lit un autre code que celui du dossier, la carte le dit (« L’IA lit plutôt CQ410 ») avec un bouton <b>utiliser</b>.</p>
      <Steps>
        <Step title="Ouvrir la correction">Clique le <b>crayon</b> à côté du code, le bouton <b>utiliser</b> d’un code lu par l’IA, ou appuie sur <Key>E</Key>.</Step>
        <Step title="Écrire le bon code">Recopie le code tel qu’il est donné dans la source, et corrige la réduction si besoin. L’extrait de la source est rappelé en haut de la fenêtre.</Step>
        <Step title="Corriger et réanalyser">Le code est remplacé (le reste ne bouge pas) et l’analyse repart aussitôt avec le bon code. La correction est notée dans l’historique du code.</Step>
      </Steps>
      <Callout tone="tip">Un code déjà au catalogue pour cet outil est refusé, comme dans Codes. Pour changer l’outil, le créateur ou la source, passe par la fiche du code dans <Link href="/admin/codes">Codes</Link>.</Callout>
    </Section>
    <Section id="clavier" title="Aller vite au clavier">
      <Legend rows={[
        { term: <><Key>J</Key> <Key>K</Key></>, meaning: 'Dossier suivant, dossier précédent.' },
        { term: <Key>A</Key>, meaning: 'Analyser le dossier en cours.' },
        { term: <Key>E</Key>, meaning: 'Corriger le code du dossier en cours.' },
        { term: <Key>V</Key>, meaning: 'Valider.' },
        { term: <Key>T</Key>, meaning: 'Testé au paiement.' },
        { term: <Key>R</Key>, meaning: 'Rejeter.' },
      ]} />
    </Section>
    <Section id="retests" title="Les retests de nuit">
      <p>Chaque nuit, Merkod relit la source des codes <b>vérifiés depuis plus de {RETEST_DAYS} jours</b>, jusqu’à 40 par nuit, les plus anciens d’abord. Il ne change rien tout seul.</p>
      <p>Si la nouvelle analyse n’est plus claire (vidéo supprimée, code disparu de la description), le code arrive dans l’onglet <b>Retests</b>. Tu l’ouvres, puis :</p>
      <Legend rows={[
        { term: <Fake tone="pri">✓ Valider</Fake>, meaning: 'Le code est toujours bon : la date du test est remise à aujourd’hui et il quitte la liste.' },
        { term: <Fake tone="no">✗ Rejeter</Fake>, meaning: 'Le code est mort : il quitte le site.' },
      ]} />
      <p>Un code vérifié dont la <b>date de fin est passée</b> arrive aussi dans cet onglet, et le site ne le présente plus comme vérifié (« Peut-être expiré »). S’il marche encore, « Valider » le confirme et retire la date passée.</p>
      <Callout tone="tip">Le bouton <b>Lancer les retests maintenant</b> fait le même travail tout de suite, sans attendre la nuit.</Callout>
    </Section>
    <Section id="ia" title="L’IA, son coût et ses limites">
      <p>Le bandeau du haut dit si l’IA est <b>active</b>, <b>en attente d’activation</b> (pas encore de clé) ou si le <b>plafond du mois</b> est atteint. Sans IA, les contrôles automatiques marchent quand même.</p>
      <p>Quand elle est active, un petit modèle rapide lit chaque description. Un modèle plus fin relit seulement les dossiers douteux, ou quand tu cliques sur <b>Relire avec Opus</b>. La jauge montre la dépense du mois face au plafond, en euros (survole le montant pour le voir en dollars).</p>
      <p>Les dossiers s’affichent par pages de 24, comme les autres listes ; <Key>J</Key> et <Key>K</Key> passent d’une page à l’autre quand tu arrives au bout. Le message qui confirme une décision s’affiche en bas de l’écran, pour rester visible même loin du haut de la liste.</p>
      <Callout tone="warn">L’IA ne décide jamais seule : elle aide à repérer les codes dans un texte, et ne peut que retirer des points quand elle ne voit pas le code. Un code qu’elle croit voir mais qui n’est pas mot pour mot dans la source est écarté, tout comme une année ou une clé de licence.</Callout>
      <Callout tone="tip">Seuls les textes publics (titre et description) sont envoyés à l’IA. Aucune donnée de visiteur : la promesse « zéro pistage » tient.</Callout>
    </Section>
  </>;
}

function Podcasts() {
  return <>
    <Section id="pourquoi" title="Pourquoi suivre des podcasts">
      <p>Beaucoup de podcasts sont financés par des sponsors : l’animateur lit une publicité et donne un <b>code promo</b>, qu’il répète souvent dans les notes de l’épisode. Suivre un podcast, c’est demander à Merkod de lire ces notes à chaque nouvel épisode pour y repérer les codes.</p>
      <Callout tone="rule">Un code trouvé dans un podcast n’est jamais publié tout seul : il arrive « En attente » dans <Link href="/admin/verifications">Vérifications</Link>, et c’est toi qui décides.</Callout>
    </Section>
    <Section id="ajouter" title="Ajouter un podcast">
      <Steps>
        <Step title="Cherche-le">La page a trois onglets : <b>Suivis</b> (ta liste), <b>+ Ajouter un podcast</b> et <b>Candidats</b>. Les codes d’outils absents du catalogue ont leur page, <b>Outils › Outils à ajouter</b> (voir plus bas). Dans le deuxième, tape le nom du podcast puis <b>Chercher</b>. Merkod interroge l’annuaire d’Apple Podcasts, gratuit et sans clé. Les noms sous le champ sont les podcasts conseillés pour démarrer : un clic lance la recherche.</Step>
        <Step title="Ou découvre-en">Sous la recherche, <b>Découvrir, classement Apple</b> propose cinq genres où les sponsors donnent souvent des codes d’outils : Entrepreneuriat, Affaires, Technologies, Investissement et Marketing. Un clic affiche les 50 podcasts les plus écoutés en France dans ce genre, avec leur rang, sans ceux que tu suis déjà.</Step>
        <Step title="Vérifie que c’est le bon">L’auteur, le genre et le nombre d’épisodes aident à éviter les homonymes. <b>Écouter</b> ouvre sa page Apple Podcasts.</Step>
        <Step title="Clique sur Suivre">Le podcast rejoint l’onglet Suivis. Merkod crée aussi son <b>créateur</b> (au nom du podcast) et y relie un compte « Podcast » : les codes trouvés seront crédités à ce créateur. Tu peux le renommer ou lui relier ses autres réseaux dans <Link href="/admin/createurs">Créateurs</Link>.</Step>
      </Steps>
    </Section>
    <Section id="candidats" title="Les podcasts candidats">
      <p>Chaque lundi, Merkod parcourt la <b>base publique de Podcast Index</b>, un annuaire ouvert de plus de 4 millions de podcasts. Il prend les 10 000 plus populaires qui ont publié depuis 90 jours, en français ou en anglais, et qu’Apple connaît (pour pouvoir les suivre). Tous les genres sont lus : un podcast d’humour ou de sport a aussi des sponsors. Il lit leurs épisodes récents avec le même repérage que les podcasts suivis, sans IA : un podcast qui cite un <b>outil du catalogue près d’un code</b> devient candidat.</p>
      <p>L’onglet <b>Candidats</b> les montre, ceux qui citent le plus d’outils en premier. Pour chacun : l’auteur, la langue, la catégorie, le nombre d’épisodes, la date du dernier, puis chaque outil cité avec le code, l’extrait des notes et le lien vers l’épisode.</p>
      <Legend rows={[
        { term: 'Suivre', meaning: 'Le podcast rejoint tes Suivis, comme depuis une recherche. Il est lu dès la nuit suivante et ses codes arrivent dans Vérifications.' },
        { term: 'Écarter', meaning: 'Le candidat passe dans « Écartés » et y reste, même s’il revient au passage suivant. « Remettre » le ramène.' },
      ]} />
      <Callout tone="rule">Un candidat n’ajoute aucun code au catalogue : c’est une idée de podcast à suivre. Les codes ne viennent qu’après le suivi, par la lecture de nuit, et passent par Vérifications.</Callout>
      <Callout tone="warn" title="À régler une fois">Le passage tourne sur GitHub (la base pèse plusieurs Go, trop pour Vercel). Dans le dépôt, <b>Settings › Secrets and variables › Actions</b> : ajoute le secret <b>CRON_SECRET</b> (le même que sur Vercel) et la variable <b>MERKOD_URL</b> (l’adresse du site). Sans eux, le passage s’arrête sans rien faire. Ajoute aussi les secrets <b>PODCASTINDEX_API_KEY</b> et <b>PODCASTINDEX_API_SECRET</b> (ton compte Podcast Index) : si le site refuse le téléchargement de la base, Merkod passe par l’API, avec moins de podcasts (tendances et flux récents). Le passage se lance aussi à la main depuis l’onglet Actions, « Podcast Index ».</Callout>
    </Section>
    <Section id="liste" title="La liste des suivis">
      <Legend rows={[
        { term: <StatusDot tone="ok">Lu chaque nuit</StatusDot>, meaning: 'Le podcast est suivi : ses nouveaux épisodes seront lus.' },
        { term: <StatusDot tone="muted">En pause</StatusDot>, meaning: 'Le podcast reste dans la liste mais n’est plus lu. Pratique pour un podcast qui ne donne plus de codes, sans le perdre.' },
      ]} />
      <p><b>Dernière lecture</b> dit quand ses épisodes ont été lus pour la dernière fois, et <b>Codes trouvés</b> combien de codes viennent de ses épisodes (un clic les ouvre dans Codes). <b>Ne plus suivre</b> le retire de la liste : son créateur, son compte et ses codes restent.</p>
      <p>Un clic sur un podcast ouvre son <b>détail</b> à droite, avec ses <b>derniers épisodes</b> : la date, un lien vers l’épisode, s’il a été <b>Lu</b> par Merkod, et les codes trouvés dans ses notes avec leur état (En attente, Vérifié…) ou l’outil à ajouter. Tu vois ainsi ce que Merkod a lu, et pas seulement le résultat. Un épisode trop ancien au moment du suivi, ou sorti depuis la dernière lecture, reste « Pas lu ».</p>
      <p>Comme les autres listes, l’onglet Suivis se filtre (Tous, Lus chaque nuit, En pause, Jamais lus, Avec codes trouvés, Rien depuis 90 jours), se cherche par nom de podcast ou de créateur, se trie, s’affiche en cartes ou en tableau et se lit page par page.</p>
    </Section>
    <Section id="rendement" title="Le rendement de chaque podcast">
      <p>Tous les podcasts ne se valent pas. Pour chacun, Merkod donne les codes <b>trouvés</b> dans ses épisodes, combien sont <b>publiés</b> sur le site (vérifiés ou à tester), combien de fois les visiteurs les ont <b>copiés ce mois-ci</b>, et la date de son <b>dernier code</b>.</p>
      <p>La liste s’ouvre rangée par <b>rendement</b> : d’abord les podcasts dont les codes sont le plus copiés, puis ceux qui ont le plus de codes publiés, puis le plus de codes trouvés. En tableau, les colonnes Copies du mois et Dernier code se trient aussi ; la colonne État donne aussi la date de dernière lecture.</p>
      <Callout tone="tip">L’onglet <b>Rien depuis 90 jours</b> liste les podcasts suivis depuis plus de 90 jours qui n’ont donné aucun code depuis 90 jours. Le bouton <b>Mettre en pause les actifs</b> les arrête d’un coup : ils ne sont plus lus la nuit, mais gardent leurs codes et leur historique. Tu peux les reprendre un par un.</Callout>
    </Section>
    <Section id="lecture" title="La lecture des épisodes">
      <Steps>
        <Step title="Chaque nuit">Merkod lit les épisodes récents de chaque podcast actif dans Apple Podcasts : ceux des {FIRST_READ_DAYS} derniers jours la première fois, puis ceux sortis depuis la lecture précédente.</Step>
        <Step title="Repérer les codes">Dans les notes de chaque épisode, Merkod cherche un code annoncé par « code », « code promo » ou « coupon », et un <b>outil du catalogue</b> nommé (ou son site cité) sur la même ligne ou celle d’avant. Si l’outil n’est pas au catalogue, le code est gardé dans <b>Outils › Outils à ajouter</b>.</Step>
        <Step title="L’IA, quand elle est active">Quand l’IA est activée, elle lit aussi les notes des nouveaux épisodes qui parlent d’une offre. C’est elle qui lit en premier : elle retrouve les codes mal formulés, la réduction exacte et la date de fin, et rattache chaque code au bon outil ; son outil et sa réduction priment sur le repérage. Elle ne garde que les codes écrits mot pour mot dans les notes. Un épisode déjà lu n’est pas relu, et chaque lecture compte dans le plafond du mois. Sans IA, le repérage ci-dessus continue seul.</Step>
        <Step title="L’envoyer en vérification">Chaque nouveau code est ajouté <b>En attente</b> (invisible sur le site), crédité au créateur du podcast, avec l’épisode comme source. Son dossier est analysé aussitôt et t’attend dans <Link href="/admin/verifications">Vérifications</Link>. Un code déjà connu pour cet outil n’est jamais recréé.</Step>
      </Steps>
      <p><b>Lire les épisodes maintenant</b>, en haut de la page, lance la lecture sans attendre la nuit ; <b>Lire</b>, sur une ligne, lit ce seul podcast, même en pause. Un résumé dit combien de codes ont été trouvés.</p>
      <Callout tone="warn">La réduction est reprise de la ligne du code quand elle y figure (« -20 % », « 3 mois offerts »), sinon elle vaut « Voir l’épisode ». Corrige-la dans <Link href="/admin/codes">Codes</Link> avant de valider.</Callout>
    </Section>
    <Section id="outils-a-ajouter" title="Les outils à ajouter">
      <p>Beaucoup de sponsors de podcasts sont des outils que Merkod ne suit pas encore (« code GDIY sur gradium.ai »). Plutôt que de perdre ces codes, Merkod les garde dans la page <Link href="/admin/outils/a-ajouter">Outils à ajouter</Link>, sous Outils dans le menu (les vidéos YouTube et les analyses y envoient aussi les leurs), avec le nom deviné de l’outil, son site quand un lien est cité, le code, la réduction, l’extrait des notes et l’épisode. Une offre donnée seulement par un lien y arrive avec l’étiquette <b>Lien seul</b> et son lien : l’ajouter crée une offre sans code, en attente dans Vérifications.</p>
      <p>Merkod ne prend pas pour un outil une étiquette qui ouvre la ligne (« Avantages : avec le code… », « Offre : … »), ni une plateforme de paiement (Thrivecart, systeme.io, Gumroad, Kajabi, Podia…) : elle encaisse la formation ou le livre du créateur, ce n’est pas l’outil en promotion. Dans le classement d’Apple, un podcast listé deux fois (même nom, même auteur) n’apparaît qu’une fois, et une pochette qui ne charge pas laisse place aux initiales du podcast.</p>
      <Steps>
        <Step title="Déjà dans le catalogue ?">Quand un outil du catalogue porte déjà ce nom ou ce site (ajouté depuis, ou écrit autrement), la carte le dit et le bouton devient <b>Relier à …</b> : un clic, et le code part en attente sur cet outil, sans formulaire. Si cet outil est archivé, restaure-le d’abord dans <Link href="/admin/outils">Outils</Link>.</Step>
        <Step title="Vérifie l’outil">Le nom est deviné sans IA, d’après le lien voisin (gradium.ai devient « Gradium ») ou le mot qui ouvre la ligne (« Cuure : … »). Ouvre le site et l’épisode pour t’assurer que c’est bien un outil en ligne qui a sa place dans Merkod.</Step>
        <Step title="Fais-le analyser par l’IA (facultatif)"><b>Analyser avec l’IA</b> lit la page d’accueil du site et te donne un résumé de ce que fait l’outil, s’il s’agit bien d’un outil en ligne, et la catégorie où le ranger. Quand aucune catégorie ne convient, l’IA propose d’en créer une. Elle devine aussi l’<b>univers</b> de la marque : une marque de soins, de vêtements ou de matériel n’est pas un outil en ligne, la carte le signale (« Univers proposé : Beauté et soins ») pour que tu la ranges à part. Le bouton est grisé tant que l’IA n’est pas activée ; chaque analyse compte dans le plafond du mois.</Step>
        <Step title="Si le site refuse les robots">Certains sites refusent d’être lus par un programme : l’analyse répond alors « a répondu 403 », ou que la page est vide. Cherche l’outil sur son site ou sur Google, copie ce qu’il fait, colle-le dans <b>Ce que fait l’outil</b> (dans le formulaire « Ajouter l’outil ») et relance <b>Analyser avec l’IA</b> : l’IA lit ton texte à la place du site.</Step>
        <Step title="Ajoute l’outil">Le bouton <b>Ajouter l’outil</b> ouvre le formulaire pré-rempli, avec la proposition de l’IA si tu l’as demandée : choisis la catégorie, corrige le nom ou le site si besoin. Aucune catégorie ne convient ? Choisis <b>+ Nouvelle catégorie</b> en haut de la liste et donne-lui un nom : elle est créée avec l’outil. Le champ <b>Univers de la nouvelle catégorie</b>, pré-rempli par l’IA, la range dans la première famille de cet univers (un univers caché ne se voit pas sur le site). Dans la liste, les catégories hors « Outils en ligne » portent le nom de leur univers. Si l’outil existe déjà sous un autre nom, choisis <b>Déjà dans le catalogue</b> et sélectionne-le.</Step>
        <Step title="Le code part en vérification">Le code, et ceux des autres suggestions du même site, arrivent <b>En attente</b> dans <Link href="/admin/verifications">Vérifications</Link>, crédités au créateur du podcast. L’outil reste hors du site tant qu’il n’a pas de code validé.</Step>
      </Steps>
      <p>La croix <b>Ignorer</b> écarte une suggestion (un lien de suivi, une émission, un produit hors sujet). Elle ne reviendra pas aux lectures suivantes.</p>
      <p><b>Offres données par un créateur.</b> Dans son studio, le créateur écrit le nom de l’outil : dès 3 lettres, Merkod lui propose ceux du catalogue. S’il n’y est pas, son offre arrive ici, marquée <b>Studio du créateur</b>, avec le site de l’outil s’il l’a donné. Une fois l’outil ajouté (ou relié), l’offre part <b>En relecture</b> dans <Link href="/admin/codes">Codes</Link>, créditée à ce créateur avec l’origine « Donné par le créateur », même si sa chaîne est prouvée.</p>
    </Section>
  </>;
}

function Outils() {
  return <>
    <Section id="quoi" title="Ce qu’est un outil">
      <p>Un outil est un produit en ligne pour lequel on collecte des codes : NordVPN, Qonto, Notion… Chaque outil a une catégorie, un site officiel, une description facultative et une <b>priorité</b>.</p>
      <Callout tone="why">Un outil apparaît sur le site dès qu’il a un code vérifié ou à tester. L’onglet <b>Sans code visible</b> liste les outils suivis mais encore invisibles : c’est ta liste de chasse.</Callout>
      <p>Dans la liste, <b>Créateurs</b> compte les créateurs différents qui donnent un code pour l’outil, et <b>Copies</b> les copies de ses codes depuis le 1er du mois. Un outil très copié avec un seul créateur mérite qu’on lui cherche d’autres codes.</p>
    </Section>
    <Section id="ajouter" title="Ajouter un outil">
      <Steps>
        <Step title="Vérifie qu’il n’existe pas déjà">Tape son nom dans la recherche, avec et sans espace.</Step>
        <Step title="Clique sur « Nouvel outil »">Donne son nom exact, tel que la marque l’écrit.</Step>
        <Step title="Choisis la catégorie">Elle est vide au départ, et l’enregistrement attend ton choix. Le menu se filtre quand tu tapes. Si aucune ne convient, crée-la d’abord dans Catégories, ou laisse l’IA la trouver (étape suivante).</Step>
        <Step title="Site officiel">Le domaine suffit : « exemple.com ». Il sert au logo et au lien. Si un outil du catalogue a déjà ce site, la fiche le signale tout de suite : c’est un doublon.</Step>
        <Step title="« Trouver la catégorie » (facultatif)">L’IA lit la page d’accueil du site et choisit la catégorie qui convient. Elle remplit aussi la description si elle est vide, et corrige l’écriture du nom (« N8N » devient « n8n »). Si aucune catégorie ne convient, elle en propose une : <b>Créer « … »</b> la crée et la choisit. Rien n’est enregistré avant <b>Enregistrer</b>. Une lecture coûte environ 0,1 centime, comptée dans le plafond du mois ; le bouton est grisé quand l’IA est coupée ou le plafond atteint.</Step>
        <Step title="Description (facultative)">Une phrase pour la fiche. Vide, le site écrit « Les codes promo donnés par les créateurs pour … ».</Step>
      </Steps>
    </Section>
    <Section id="logos" title="Les logos">
      <p>Quand tu crées un outil, Merkod récupère <b>tout seul</b> son logo et le garde en base : sur Logo.dev d’abord, sinon l’icône du site de la marque. Le site et l’admin l’affichent ensuite sans dépendre d’un autre service.</p>
      <p>Le bouton <b>Récupérer les logos</b> en haut de la page le fait pour les outils qui n’en ont pas encore (le nombre sur le bouton), par lots de 20. Si une marque change de logo ou de site, ouvre l’outil et clique <b>Actualiser le logo</b>.</p>
      <Callout tone="tip">Un logo introuvable n’empêche rien : l’outil garde son initiale colorée. Vérifie alors que son site officiel est le bon domaine.</Callout>
    </Section>
    <Section id="chercher" title="Chercher des codes pour un outil">
      <p>Dans le panneau d’un outil, <b>Chercher des codes</b> cherche sur YouTube « <i>outil</i> code promo » parmi les vidéos de l’année, pour cet outil seul, même s’il a déjà des codes. La fois suivante, la recherche change de formulation (« code réduction », « promo code »…) et écarte les vidéos déjà lues : chaque clic ramène du neuf. C’est une recherche, soit environ 100 unités du quota du jour (sur 10 000).</p>
      <p>Le compte rendu s’affiche dans le panneau : vidéos lues, unités utilisées, codes trouvés. Comme pour les catégories, <b>rien n’est publié</b> : les codes arrivent « En attente » dans <Link href="/admin/verifications">Vérifications</Link>, et ceux d’outils absents du catalogue vont dans <b>Outils › Outils à ajouter</b>. Le bouton est grisé sans clé YouTube, ou si l’outil est archivé.</p>
      <Callout tone="tip">Utilise-le pour un outil très copié qui n’a qu’un ou deux créateurs : d’autres chaînes en parlent sûrement. Pour plusieurs outils d’un coup, passe par la page <Link href="/admin/categories">Catégories</Link>.</Callout>
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
    <Section id="quoi" title="Ce qu’est un créateur pour Merkod">
      <p>Un créateur est la chaîne, le podcast ou le compte qui donne un code. Il est crédité sur chaque code et a sa page publique avec tous ses codes. Les créateurs sont créés automatiquement quand tu enregistres un code avec un nouveau nom.</p>
      <Legend rows={[
        { term: 'Sur le site', meaning: 'A au moins un code visible : sa page publique existe.' },
        { term: 'Sans code visible', meaning: 'Tous ses codes sont en attente ou rejetés : il n’apparaît pas encore.' },
      ]} />
    </Section>
    <Section id="trier" title="Trier, filtrer et trouver qui contacter">
      <p>Sous les onglets, trois listes affinent la page : <b>réseau</b> (YouTube, Podcast, autre réseau, aucun compte), <b>langue</b> (français, anglais, autre, inconnue) et <b>audience</b> (moins de 10 k abonnés, 10 k à 100 k, 100 k à 1 M, plus de 1 M). Les nombres des onglets suivent ces filtres ; <b>Effacer les filtres</b> les remet à zéro.</p>
      <p>Tu peux aussi trier par <b>abonnés</b> (son compte le plus suivi), par <b>notes</b> (son podcast le plus noté sur Apple Podcasts) et par <b>copies du mois</b> (combien de fois ses codes ont été copiés depuis le 1er). Dans le tableau, clique sur l’en-tête Audience ou Copies ; en cartes, utilise le menu de tri.</p>
      <Steps>
        <Step title="Ouvre l’onglet À contacter">Il garde les créateurs déjà sur le site qui ne nous connaissent pas encore : aucun compte prouvé par la bio, pas d’espace créateur, pas de revendication en attente.</Step>
        <Step title="Commence par le haut">La liste est rangée par potentiel : d’abord ceux dont les codes sont le plus copiés, puis les plus suivis, puis les podcasts les plus notés. Filtre sur Français pour une première campagne en France.</Step>
        <Step title="Propose-lui sa page">Écris-lui (e-mail de contact de sa chaîne) avec le lien de sa page publique : il peut la revendiquer, et il sort de la liste dès qu’il le fait.</Step>
      </Steps>
      <Callout tone="why">Un créateur dont les codes sont déjà copiés a une raison concrète de s’intéresser à Merkod : ses abonnés l’utilisent. C’est le meilleur premier contact pour l’espace créateur payant.</Callout>
    </Section>
    <Section id="fiche" title="Lire la fiche d’un créateur">
      <p>Clique sur un créateur : le panneau s’ouvre en trois onglets, pour ne voir que ce dont tu as besoin.</p>
      <Steps>
        <Step title="Aperçu">L’essentiel : son niveau, ses codes, les copies du mois, son audience, son pays, sa page publique, sa présentation et les outils qu’il recommande. En tête, <b>À faire</b> liste ce qu’il reste à faire pour lui (relier un compte, le contrôler, suivre ses vidéos, écrire sa présentation) : clique sur une ligne pour aller au bon endroit.</Step>
        <Step title="Comptes">Ses chaînes et profils : audience, pays et langue, <b>Suivre ses vidéos</b> pour une chaîne YouTube, et les boutons Actualiser, Pays et langue, Retirer. <b>Relier un compte</b> en ajoute un ; <b>Actualiser la photo</b> est en bas.</Step>
        <Step title="Confiance">Tout ce qui fait monter son niveau, compte par compte : le contrôle par Merkod (case « J’ai contrôlé ce compte », badge certifié) puis la preuve par la bio.</Step>
      </Steps>
      <p><b>Voir ses codes</b> ouvre la liste des codes filtrée sur lui. Sa <b>photo de profil</b> s’affiche sur sa carte, dans le tableau et dans le panneau quand on l’a récupérée depuis sa chaîne YouTube ou son podcast. Sinon, ce sont ses initiales.</p>
      <p>Sous le titre de la page, l’encadré d’entretien regroupe les boutons qui agissent sur <b>tous</b> les créateurs : <b>Comptes</b> (relier, actualiser, récupérer les photos) et <b>Vidéos YouTube</b> (suivre les chaînes, les lire). Ils ne sont pas à cliquer tous les jours : Merkod fait la plupart de ce travail chaque nuit.</p>
      <Callout tone="tip">Un créateur qui recommande déjà trois outils en a souvent d’autres. Regarde ses dernières vidéos : c’est la façon la plus rapide de trouver de nouveaux codes.</Callout>
    </Section>
    <Section id="profil" title="Écrire son profil">
      <p><b>Modifier le profil</b> (dans le panneau, ou l’icône crayon sur sa carte) change son <b>nom</b> et sa <b>présentation</b>. Les deux s’affichent en haut de sa page publique, au-dessus de ses codes.</p>
      <Steps>
        <Step title="Va voir sa chaîne">Lis sa description et deux ou trois titres de vidéos : de quoi parle-t-il, pour qui ?</Step>
        <Step title="Écris une ou deux phrases">Ce qu’il fait et pour qui, sans superlatif. Par exemple : « Teste les outils d’IA pour les indépendants, une vidéo par semaine. » 400 caractères au plus.</Step>
        <Step title="Enregistre">La page publique se met à jour tout de suite. Vide le champ pour retirer la présentation.</Step>
      </Steps>
      <p>Sur sa page, sous la présentation, le site affiche aussi ses <b>thèmes</b> (les catégories des outils de ses codes, rien à saisir) et ses <b>comptes sur les réseaux</b> reliés ici, avec leur audience (abonnés, ou pour un podcast sa note et ses épisodes) et un lien vers chaque compte.</p>
      <Callout tone="why">Un visiteur qui arrive de Google sur la page d’un créateur doit comprendre en deux secondes qui il est. Et le jour où le créateur découvrira sa page, une présentation juste lui donnera envie de la revendiquer.</Callout>
    </Section>
    <Section id="niveaux" title="Les trois niveaux d’un créateur">
      <p>Le niveau dit à quel point Merkod est sûr que le créateur est bien celui qu’il prétend être. Il compte dans le score des <Link href="/admin/verifications">Vérifications</Link>.</p>
      <Legend rows={[
        { term: <StatusDot tone="muted">{CREATOR_LEVEL_LABELS.spotted}</StatusDot>, meaning: 'Merkod connaît son nom, mais personne n’a encore contrôlé ses comptes. C’est le niveau de départ.' },
        { term: <StatusDot tone="ok">{CREATOR_LEVEL_LABELS.checked}</StatusDot>, meaning: `Tu as contrôlé un de ses comptes et il a au moins ${MIN_SUBSCRIBERS} abonnés (ou, pour un podcast, au moins ${MIN_RATINGS} notes sur Apple Podcasts), ou ce compte a le badge certifié du réseau.` },
        { term: <StatusDot tone="info">{CREATOR_LEVEL_LABELS.verified}</StatusDot>, meaning: 'Le créateur a prouvé lui-même, avec un code dans sa bio (voir plus bas), qu’un compte « Contrôlé par Merkod » est à lui. La preuve sur un compte sous le seuil d’audience ne compte pas.' },
      ]} />
      <p>Le filtre <b>À contrôler</b> liste les créateurs déjà sur le site mais encore repérés : commence par eux.</p>
      <p>Sur le site, un créateur contrôlé ou vérifié porte une coche verte à côté de son nom, et la mention <b>✓ Contrôlé par Merkod</b> (ou <b>✓ Créateur vérifié</b>) sur sa page. Un créateur repéré n’a aucune marque.</p>
    </Section>
    <Section id="comptes" title="Relier et contrôler un compte">
      <Steps>
        <Step title="Relie sa chaîne">Dans le panneau du créateur, <b>Relier un compte</b>, choisis YouTube et colle le lien de la chaîne (youtube.com/@pseudo). Merkod lit son identifiant, son nom et ses abonnés. Pour TikTok, Instagram, X, Twitch et Snapchat, écris le pseudo <i>ou</i> colle le lien du profil : l’autre se remplit tout seul. Recopie aussi les abonnés affichés sur le profil.</Step>
        <Step title="Contrôle-le">Ouvre le compte : il est actif, il publie sous ce nom, ce n’est pas une copie. Coche alors <b>J’ai contrôlé ce compte</b>.</Step>
        <Step title="Coche le badge s’il y en a un">Si la chaîne affiche la coche grise de compte certifié, coche <b>Badge certifié du réseau</b>. Ce badge suffit pour passer « Contrôlé par Merkod ».</Step>
      </Steps>
      <p>Pour YouTube et les podcasts, tu n’as souvent rien à faire : le compte se relie <b>tout seul</b>. Quand tu ajoutes un code dont la source est une vidéo YouTube, Merkod retrouve la chaîne qui l’a publiée et la relie au créateur. Pour les créateurs déjà en base, le bouton <b>Relier les comptes</b> en haut de la page le fait pour tous d’un coup : la chaîne YouTube d’après leurs vidéos, et le podcast d’après leurs épisodes Apple Podcasts. Le nombre sur le bouton compte les créateurs sans aucun compte et ceux dont un compte peut encore être retrouvé ; un podcast que tu suis a déjà son compte, il n’y est pas. La tâche de nuit rattrape ceux qui arrivent par l’import. Un compte relié ainsi n’est pas contrôlé : c’est toujours toi qui coches. Merkod liste ensuite les créateurs restés sans compte en disant d’où viennent leurs codes (Instagram, TikTok, Spotify, un site web, aucun code…) ou ce qui a bloqué (vidéos de plusieurs chaînes, deux noms pour la même chaîne) : ceux-là se font à la main.</p>
      <p><b>Les photos</b> suivent les comptes : dès qu’une chaîne YouTube est reliée, Merkod récupère sa photo de profil, la garde en base et l’affiche partout sur le site et dans l’admin. Un créateur qui n’a qu’un podcast prend la <b>pochette de son podcast</b> (Apple Podcasts), dès que tu suis le podcast ou que tu le relies. Le bouton <b>Récupérer les photos</b> en haut de la page le fait pour les créateurs qui ont une chaîne ou un podcast mais pas encore de photo (le nombre sur le bouton). Si un créateur change d’avatar, ouvre sa fiche et clique <b>Actualiser la photo</b>. Chaque lot de 50 chaînes coûte 1 unité du quota YouTube ; les pochettes sont gratuites. Les visiteurs ne contactent jamais Google : c’est Merkod qui sert l’image.</p>
      <p><b>Pays et langue</b> : pour cibler ta communication (francophones, anglophones…), chaque créateur affiche un drapeau et sa langue dans la liste, et « Pays et langue » dans sa fiche. YouTube donne le pays quand le créateur l’a rempli sur sa chaîne, et souvent la langue ; un podcast donne sa langue dans son flux. Sinon, Merkod devine la langue sur la description. Le pays d’un podcast n’est jamais public : corrige-le avec <b>Pays et langue</b> sur le compte (codes à deux lettres, ex. « BE fr ») ; une correction à la main n’est plus jamais remplacée. <b>Actualiser les comptes</b> en haut de la page relit d’un coup les abonnés, l’audience, le pays et la langue de toutes les chaînes (1 unité du quota par lot de 50) et de 15 podcasts à la fois (reclique pour les suivants).</p>
      <p><b>Actualiser</b> relit un compte à sa source. Pour une chaîne YouTube : ses abonnés, ses vues et son nombre de vidéos (1 unité du quota YouTube, sur 10 000 par jour). Pour un podcast, qui n’a pas d’abonnés publics : sa <b>note sur 5</b> et son <b>nombre de notes</b> sur Apple Podcasts, et son <b>nombre d’épisodes</b> (gratuit). Une note avec beaucoup de notes est un bon signe d’audience. Les autres réseaux se corrigent à la main avec <b>Modifier les abonnés</b>. <b>Retirer</b> enlève le compte, pas le créateur ni ses codes.</p>
      <Callout tone="warn">Un même compte ne peut être relié qu’à un seul créateur. Si Merkod refuse, il te dit à qui il est déjà relié : c’est souvent un doublon de nom à corriger.</Callout>
    </Section>
    <Section id="suivre" title="Suivre les vidéos d’une chaîne">
      <p>Un créateur qui a déjà donné un code en redonnera. Coche <b>Suivre ses vidéos</b> sur son compte YouTube : chaque nuit, Merkod lit les nouvelles vidéos de la chaîne et cherche des codes dans leur description, comme pour les podcasts. Les codes trouvés arrivent « En attente » dans Vérifications, crédités à ce créateur. La case n’apparaît que pour une chaîne lue par Merkod (avec son identifiant) ; décoche-la pour mettre la chaîne en pause, elle garde sa date de lecture.</p>
      <p><b>Suivre les chaînes</b>, en haut de la page, suit d’un coup les chaînes reliées de tous les créateurs qui ont au moins un code. Une chaîne que tu as mise en pause reste en pause. <b>Lire les chaînes suivies</b> lance la lecture tout de suite, sans attendre la nuit. Une lecture s’arrête d’elle-même au bout de 4 minutes, pour ne pas être coupée par l’hébergeur : le message dit combien de chaînes restent, reclique pour continuer (ou laisse la nuit s’en charger). Une vidéo illisible est notée et n’arrête plus les autres.</p>
      <Callout tone="why">Lire une chaîne coûte environ 1 unité du quota YouTube, contre 100 pour une recherche : 100 chaînes suivies coûtent moins qu’une seule recherche. Les vidéos déjà lues (par une recherche ou une lecture précédente) sont écartées. La première lecture remonte 45 jours, les suivantes reprennent depuis la dernière.</Callout>
    </Section>
    <Section id="preuve" title="Faire prouver un compte par la bio">
      <p>Seul le vrai propriétaire d’un compte peut modifier sa bio. C’est la preuve la plus simple : tu donnes un code au créateur, il l’ajoute à la bio du compte, et Merkod le retrouve. Le créateur passe alors <b>Créateur vérifié</b>, et ce compte porte une coche bleue sur sa page.</p>
      <Steps>
        <Step title="Contrôle le compte d’abord">Coche <b>J’ai contrôlé ce compte</b> après avoir vérifié que c’est la vraie chaîne du créateur. Le compte doit aussi être « Contrôlé par Merkod » : au moins {MIN_SUBSCRIBERS} abonnés (ou {MIN_RATINGS} notes pour un podcast), ou le badge certifié du réseau. Sinon, <b>Donner un code</b> reste grisé et Merkod refuse la preuve.</Step>
        <Step title="Donne un code">Dans le panneau du créateur, sous le compte, <b>Donner un code</b>. Merkod crée un code du type MERKOD-7F3K2Q, valable 14 jours.</Step>
        <Step title="Envoie-le">« Copier le message » prépare un e-mail prêt à envoyer, avec le code et la marche à suivre. Envoie-le à l’adresse laissée dans sa demande.</Step>
        <Step title="Retrouve le code">YouTube : <b>Lire la bio</b> lit la description de la chaîne (1 unité de quota). Si le code y est, c’est fait. Autres réseaux : ouvre le profil toi-même et clique <b>J’ai vu le code dans la bio</b>.</Step>
      </Steps>
      <p>Une fois prouvé, le créateur peut retirer le code de sa bio. <b>Nouveau code</b> remplace un code perdu ou expiré, <b>Annuler</b> arrête la preuve en cours, et <b>Retirer la preuve</b> enlève la vérification si tu découvres une erreur.</p>
      <p><b>Le créateur peut aussi le faire seul.</b> Connecté à son espace avec une revendication en cours, il voit les comptes reliés à sa page. Pour chaque compte que tu as contrôlé, il obtient <b>son propre code</b> (un par personne : un imposteur ne peut ni écraser ni bloquer celui du vrai), le colle dans sa bio, puis clique <b>Vérifier ma description</b> (YouTube, Merkod lit tout seul) ou <b>C’est fait</b> (autres réseaux). Dès que le code est trouvé, le compte est prouvé et son espace s’ouvre, sans que tu aies à donner l’accès.</p>
      <p>Pour les autres réseaux, sa demande arrive en haut de <Link href="/admin/createurs/demandes">Demandes créateurs</Link>, dans <b>Codes à constater</b> : ouvre le profil, puis <b>J’ai vu le code</b> ou <b>Pas trouvé</b> (il pourra réessayer).</p>
      <p><b>La preuve est facultative.</b> Un créateur sans chaîne, ou pressé, clique <b>Passer cette étape</b> : il donne son nom de créateur et son studio s’ouvre sur une page à ce nom, <b>non vérifiée</b> tant qu’aucun compte n’est prouvé. Il ne peut pas reprendre le nom ni le @ d’une page existante : Merkod lui propose de la revendiquer à la place. Sa page reste invisible sur le site tant qu’elle n’a pas de code publié. Dans son studio, l’encart <b>Fais vérifier ta chaîne</b> lui demande le lien de sa chaîne : la demande arrive dans <Link href="/admin/createurs/demandes">Demandes créateurs</Link> avec ce lien. Ajoute le compte à sa page et contrôle-le ; son code de preuve apparaît alors dans son studio. Depuis son studio, il ajoute ses offres lui-même (<b>Ajouter une offre</b>) : un code promo, son lien d’affiliation, ou les deux, et une offre par lien s’il en a plusieurs pour un même outil (l’interrupteur <b>Liens d’affiliation</b> ne concerne que la lecture par l’IA, pas le créateur). Avec code et lien, le coupon du site affiche « via le lien de … » : la copie ouvre son lien. Tant que sa page n’est pas vérifiée, ses offres arrivent <b>En relecture</b> dans <Link href="/admin/codes">Codes</Link>, avec l’origine « Donné par le créateur » ; une fois un compte prouvé, elles sont publiées tout de suite, « À tester », et tu peux toujours les retirer.</p>
      <p><b>Pages à relier.</b> Il arrive qu’un créateur ouvre son studio sur une page provisoire alors que sa vraie page existe déjà, sous un nom proche (créée par toi, avec ses codes). Son studio le repère et lui propose <b>C’est moi, relier cette page</b>. En haut de <Link href="/admin/createurs/demandes">Demandes créateurs</Link>, la section <b>Pages à relier</b> liste ces cas : si c’est sans doute la même personne, clique <b>Envoyer l’invitation</b> pour lui écrire. Rien ne part tout seul, et la date de l’envoi s’affiche ensuite. Il revendique alors la vraie page et la prouve par sa bio. Dès que c’est fait (ou que tu lui donnes l’accès), sa page provisoire y est <b>fusionnée</b> : ses codes et ses comptes passent sur la vraie page, et la page provisoire disparaît. Une page déjà prouvée n’est jamais fusionnée.</p>
      <Callout tone="why">En libre-service, le seuil d’audience ne bloque pas : un petit créateur prouve son compte et entre dans son espace, mais n’a la rosette « Créateur vérifié » qu’une fois le seuil atteint. Ton contrôle du compte reste obligatoire avant toute preuve.</Callout>
      <Callout tone="warn">Merkod lit toujours le compte relié à la fiche, jamais celui envoyé dans la demande. Un imposteur peut mettre le code dans la bio de son propre faux compte, mais ça ne prouve rien pour la page du vrai. Pour TikTok ou Instagram, ouvre bien le profil relié à la fiche. C’est pour ça que le contrôle du compte passe avant : si un faux compte était relié par erreur, la preuve le validerait.</Callout>
    </Section>
    <Section id="noms" title="Garder des noms propres">
      <p>Les majuscules ne comptent pas, mais « Le Grand JD » et « LeGrandJD » font deux créateurs différents, avec deux pages à moitié vides. Utilise toujours le nom exact de la chaîne et choisis-le dans la liste proposée quand tu tapes.</p>
      <p>Si un nom est mal écrit, <b>Modifier le profil</b> le corrige partout d’un coup, sur tous ses codes.</p>
      <Callout tone="warn">Changer le nom change le nom affiché sur le site. Vérifie l’orthographe sur la chaîne du créateur avant de valider.</Callout>
    </Section>
    <Section id="demandes" title="Répondre aux demandes des créateurs">
      <p>Sur la page publique d’un créateur, deux liens sous ses codes : <b>C’est ta page ? Revendique-la</b> et <b>Signaler une erreur</b>. Ce qu’on y envoie arrive dans <Link href="/admin/createurs/demandes">Demandes créateurs</Link> (menu Modération), et l’accueil te le rappelle dans <b>À faire</b>.</p>
      <Legend rows={[
        { term: 'C’est ma page', meaning: 'Quelqu’un dit être le créateur. Il laisse son e-mail et le lien d’un de ses comptes.' },
        { term: 'Page incorrecte', meaning: 'Un visiteur ou le créateur signale une erreur : mauvais nom, compte qui n’est pas le sien, code qui ne vient pas de lui. L’e-mail est facultatif.' },
      ]} />
      <Steps>
        <Step title="Lis la demande">Ouvre la page du créateur et le compte indiqué. Le lien envoyé est-il bien un des comptes reliés au créateur ?</Step>
        <Step title="Réponds">Le bouton <b>Répondre par e-mail</b> ouvre un e-mail à son adresse. Pour une revendication, demande-lui une preuve simple (un mot écrit dans la bio du compte, par exemple). Corrige la fiche s’il s’agit d’une erreur.</Step>
        <Step title="Range-la">Ajoute une note pour t’en souvenir, puis <b>Marquer traitée</b>, ou <b>Écarter</b> si c’est du spam. <b>Rouvrir</b> la remet dans « À traiter ».</Step>
      </Steps>
      <p>Depuis la connexion des créateurs, « C’est ta page ? » mène à la page <b>Pour les créateurs</b> : la personne voit les chiffres de la page, laisse son e-mail et reçoit un lien pour se connecter. La revendication arrive ici en même temps, avec le compte principal de la page comme « compte annoncé ». Un créateur déjà connecté revendique d’un clic (« Revendiquer la page … ») : pas de nouvel e-mail, la demande arrive ici et son Studio passe à la preuve par la bio.</p>
      <Steps>
        <Step title="Contrôle le compte">Relie le compte s’il ne l’est pas et coche <b>J’ai contrôlé ce compte</b>. Le créateur connecté peut alors le prouver lui-même depuis son espace, qui s’ouvre tout seul (voir « Faire prouver un compte par la bio »).</Step>
        <Step title="Ou donne l’accès toi-même">Si tu as fait la preuve à sa place (<b>Donner un code</b>), clique <b>Donner l’accès à son espace</b> sur la revendication. Tant qu’aucun compte du créateur n’est prouvé, le bouton reste grisé : survole-le pour voir pourquoi.</Step>
        <Step title="Retire-le si besoin">« Retirer l’accès » la remet dans un espace vide, sans toucher à la page.</Step>
      </Steps>
      <Callout tone="warn">Une revendication ne prouve rien à elle seule : n’importe qui peut écrire « je suis MrBeast ». Ne change jamais le niveau d’un créateur sur la seule foi d’un e-mail : demande-lui la preuve par la bio.</Callout>
      <Callout tone="why">Une revendication, c’est un créateur qui vient de lui-même. C’est le meilleur moment pour lui répondre vite et lui montrer ce que Merkod fait pour lui.</Callout>
    </Section>
    <Section id="exporter" title="Exporter les créateurs">
      <p><b>Exporter</b> donne tous les créateurs en Excel ou en CSV, avec leurs codes, les outils qu’ils recommandent et leur présentation. Utile pour préparer une prise de contact ou repérer ceux à suivre.</p>
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
    <Section id="univers" title="Les univers">
      <p>Au-dessus des familles, il y a l’<b>univers</b>. Merkod promet des codes pour les <b>outils en ligne</b> ; les autres marques que l’IA trouve dans les vidéos (vêtements, cosmétiques, compléments, matériel…) sont gardées dans leur univers : <b>Beauté et soins</b>, <b>Mode</b>, <b>High-tech et maison</b> ou <b>Autres</b>. Une famille appartient à un univers, et ses catégories et ses outils suivent.</p>
      <p>Un univers <b>caché</b> reste entier dans l’admin (codes, vérifications, créateurs), mais le site ne montre ni ses marques, ni ses codes, ni ses catégories, et le sitemap les oublie. Tu l’allumes dans <Link href="/admin/administration">Administration</Link>, le jour où il a assez de codes vérifiés. Le filtre <b>Tous les univers</b> n’en montre qu’un, et une catégorie d’un univers caché porte la mention « caché ».</p>
      <p><b>✦ Ranger par univers</b>, en haut de la page, fait lire par l’IA le nom, le site et la catégorie de chaque marque des outils en ligne, par lots de 60. Elle liste celles qui vendent autre chose, groupées par univers proposé. Change l’univers d’une ligne, ou choisis <b>Garder dans Outils en ligne</b>, puis <b>Ranger</b> : les marques retenues partent dans la catégorie d’accueil de leur univers. Rien ne bouge avant ce clic, et le journal de l’Administration note le rangement.</p>
      <Callout tone="why">La lecture coûte quelques centimes pour tout le catalogue, comptés dans le plafond du mois. En cas de doute, l’IA garde la marque dans les outils en ligne : relis surtout la catégorie fourre-tout « Boutiques en ligne ».</Callout>
    </Section>
    <Section id="familles" title="Les familles">
      <p>Chaque catégorie appartient à une <b>famille</b> : Sécurité et vie privée, Vidéo, Argent et indépendants… Les familles sont le premier niveau du menu, les catégories le second. La carte d’une catégorie affiche sa famille, et le filtre <b>Toutes les familles</b> n’en montre qu’une. <b>Sans famille</b> liste les catégories qui ne sont pas encore rangées.</p>
      <p>Dans la fiche d’une catégorie (<b>Modifier</b> ou <b>Nouvelle catégorie</b>), <b>✦ Trouver la famille</b> demande à l’IA la famille qui convient, d’après le nom de la catégorie et de ses outils. Elle la choisit dans le menu, ou, si aucune ne convient, propose un nom avec <b>Créer « … »</b> qui crée la famille et la choisit. Rien n’est enregistré avant <b>Enregistrer</b>. Un appel coûte moins d’un dixième de centime, compté dans le plafond du mois ; le bouton est grisé quand l’IA est coupée ou le plafond atteint.</p>
      <Callout tone="tip">Une catégorie répond à un besoin précis (« Gestionnaires de mots de passe »), la famille regroupe les besoins voisins. Un outil n’a qu’une catégorie.</Callout>
    </Section>
    <Section id="gerer" title="Créer, renommer et ranger">
      <p><b>Nouvelle catégorie</b> en crée une ; <b>Modifier</b> change son nom partout et sa famille. Garde des noms courts, au pluriel quand c’est naturel, compréhensibles par tout le monde (« Banques en ligne » plutôt que « Néobanques »).</p>
      <Callout tone="tip">Moins de catégories bien remplies valent mieux que beaucoup de catégories vides.</Callout>
      <p><b>✦ Ranger</b>, dans le panneau d’une catégorie, fait relire par l’IA le site officiel de chacun de ses outils, un par un. Pour chaque outil, elle dit s’il est à sa place, s’il irait mieux dans une autre catégorie, ou propose une nouvelle catégorie. Tu choisis ligne par ligne : <b>Déplacer</b> (ou <b>Créer et déplacer</b>) ou <b>Garder ici</b>. Rien ne bouge sans ton clic, et <b>Arrêter</b> interrompt la relecture.</p>
      <Callout tone="why">Utile pour une catégorie fourre-tout (« Productivité ») qui a trop grossi. Chaque outil relu coûte environ 0,1 centime, compté dans le plafond du mois : la fenêtre affiche le coût estimé avant de lancer, et la relecture s’arrête d’elle-même si le plafond est atteint. Le bouton est grisé quand l’IA est coupée.</Callout>
    </Section>
    <Section id="chercher" title="Chercher des codes pour une catégorie">
      <p>La tâche de l’accueil « Trouver des codes pour … catégories vides » cite les cinq premières et ouvre cette page déjà filtrée sur <b>Vides sur le site</b>.</p>
      <p><b>Chercher des codes</b>, en haut de la page, prend les outils des catégories vides (priorité 1 d’abord) et cherche sur YouTube « <i>outil</i> code promo » parmi les vidéos de l’année. Dans le panneau d’une catégorie, le même bouton cherche ses outils, ceux qui ont le moins de codes d’abord, même si elle a déjà des codes, puis « <i>catégorie</i> code promo » pour repérer des outils qu’on n’a pas encore.</p>
      <p><b>Chaque recherche fait du neuf.</b> Pour un même outil, Merkod change de formulation à chaque fois : « code promo », puis « code réduction », « promo code » et « discount code ». Une formulation déjà essayée ne ramène que les vidéos publiées depuis. Les vidéos déjà lues sont écartées sans être relues, et le compte rendu le dit : nouvelles chaînes, chaînes déjà connues (un créateur qu’on a, ou une vidéo déjà lue), vidéos écartées. Une chaîne nouvelle avec un code, c’est un créateur à ajouter et à suivre.</p>
      <p>Les descriptions des vidéos sont lues comme les notes des podcasts. <b>Rien n’est publié</b> : chaque code trouvé arrive « En attente » dans Vérifications, crédité à la chaîne qui l’a donné, et un code pour un outil absent du catalogue va dans <b>Outils › Outils à ajouter</b>.</p>
      <Demo caption="L’état de la recherche, sous le titre de la page.">
        <div className="gd-row"><StatusDot tone="ok">Recherche YouTube prête</StatusDot><StatusDot tone="muted">IA en attente d’activation : lecture sans IA</StatusDot></div>
      </Demo>
      <Callout tone="why">YouTube donne 10 000 unités par jour et une recherche en coûte 100 : un lancement s’arrête à 20 outils (2 000 unités). S’il en reste, le résultat le dit : relance le lendemain. Sans clé YouTube le bouton est grisé ; sans clé Anthropic la recherche marche quand même, l’IA en plus repère les codes écrits de façon inhabituelle.</Callout>
    </Section>
    <Section id="exporter" title="Exporter les catégories">
      <p><b>Exporter</b> donne chaque catégorie avec son nombre d’outils, ceux qui ont un code visible et sa couverture en pourcentage, en Excel ou en CSV.</p>
    </Section>
  </>;
}

function Sources() {
  return <>
    <Section id="quoi" title="D’où viennent les codes">
      <p>Merkod trouve ses codes à plusieurs endroits : les <b>chaînes YouTube suivies</b>, les <b>podcasts suivis</b>, la <b>recherche YouTube</b> par outil ou par catégorie, les <b>propositions des visiteurs</b>, et ce que tu ajoutes à la main. La page <Link href="/admin/sources">Sources</Link> les réunit sur une seule page, une carte par source, pour voir laquelle rapporte et laquelle coûte.</p>
    </Section>
    <Section id="carte" title="Lire une carte">
      <p>Chaque carte dit ce que la source lit, puis donne quatre chiffres :</p>
      <Steps>
        <Step title="Trouvés">Les codes que cette source a apportés, et combien ce mois-ci.</Step>
        <Step title="Publiés">Ceux que tu as validés, avec la part des codes jugés (publiés ou rejetés) qui ont été publiés. Une source qui ramène surtout des codes rejetés te fait perdre du temps.</Step>
        <Step title="En attente">Ceux qui attendent ta décision dans Vérifications.</Step>
        <Step title="Copiés">Combien de fois les visiteurs ont copié ses codes ce mois-ci. C’est le vrai rendement.</Step>
      </Steps>
      <p>Dessous : le <b>dernier passage</b> et son état, le <b>prochain</b> (« Chaque nuit à 04:30 » pour les podcasts, puis les chaînes une demi-heure après, à l’heure de Paris ; « Quand tu le lances » pour la recherche), et ce que la source a coûté ce mois-ci en unités du quota YouTube et en IA.</p>
      <Demo caption="Les trois états d’un passage.">
        <div className="gd-row"><StatusDot tone="ok">Réussi</StatusDot><StatusDot tone="warn">En partie</StatusDot><StatusDot tone="bad">Échec</StatusDot></div>
      </Demo>
      <Callout tone="why">« En partie » veut dire qu’une partie n’a pas répondu (une chaîne, un flux de podcast) : le reste a bien été lu. « Échec » veut dire que rien n’a pu être lu, souvent une clé manquante ou le quota YouTube épuisé.</Callout>
    </Section>
    <Section id="lancer" title="Lancer une source à la main">
      <p>Les chaînes et les podcasts sont lus chaque nuit tout seuls. <b>Lire maintenant</b> les lit tout de suite ; <b>Chercher pour les catégories vides</b> lance la recherche YouTube. Avant de lancer, Merkod te dit ce que ça va coûter : environ une unité par chaîne suivie, et jusqu’à 2 000 unités pour une recherche, sur 10 000 par jour.</p>
      <Callout tone="tip">Pour chercher sur une seule catégorie ou un seul outil, passe par leur page : les liens <b>Par catégorie</b> et <b>Par outil</b> y mènent. Les codes d’outils absents du catalogue vont dans <Link href="/admin/outils/a-ajouter">Outils à ajouter</Link>, lié depuis la page.</Callout>
    </Section>
    <Section id="journal" title="Le journal des passages">
      <p>En bas de la page, chaque passage est noté, la nuit comme à la main : quand, quelle source, qui l’a lancé (<b>La nuit</b> ou <b>Toi</b>), ce qui a été lu, combien de vidéos ou d’épisodes, les codes trouvés (et ceux hors catalogue), les unités dépensées et l’état. Un passage raté affiche l’erreur : c’est là qu’on voit qu’une tâche de nuit ne tourne plus.</p>
      <Callout tone="tip">Une fois par semaine, regarde le journal : s’il n’y a pas eu de passage de nuit depuis deux jours, ou s’il n’y a que des échecs, la clé YouTube ou la tâche de nuit est à vérifier.</Callout>
    </Section>
    <Section id="bientot" title="Les sources à venir">
      <p>La carte <b>Bientôt</b> liste les sources prévues : la recherche sur le web par l’IA et Spotify. Elles auront leur carte et leurs passages au journal dès qu’elles seront branchées. Podcast Index, lui, ne trouve pas de codes mais des podcasts à suivre : ils arrivent chaque lundi dans Podcasts › Candidats.</p>
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
          <p className="gd-small">La confiance, ce qui distingue Merkod. <b>Bon niveau</b> : plus de {TARGETS.verified} %. <b>Pour le faire monter</b> : 10 minutes de tests par jour dans l’onglet « À tester ».</p>
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
    <Section id="accueil" title="Le haut de l’accueil : urgent, nouveautés, conseil">
      <p>Sous « Bonjour », la ligne <b>Depuis ta dernière visite</b> résume ce qui est arrivé depuis ta visite précédente : codes trouvés, propositions reçues, copies et avis des visiteurs. Chaque chiffre ouvre la bonne page. La date de ta dernière visite est gardée dans ce navigateur seulement : sur un autre ordinateur, la ligne repart de zéro.</p>
      <p>Le cadre <b>Urgent</b> n’apparaît que s’il y a quelque chose qui ne peut pas attendre :</p>
      <Legend rows={[
        { term: 'Codes qui expirent', meaning: 'Des codes visibles dont la date de fin tombe dans les 7 jours. Cherche un nouveau code chez le même créateur avant qu’un visiteur tombe sur un code mort.' },
        { term: 'Source en échec', meaning: <>Le dernier passage d’une source (chaînes, podcasts, recherche) n’a rien pu lire. L’erreur est dans le journal de la page <Link href="/admin/sources">Sources</Link>.</> },
        { term: 'Quota ou plafond presque atteint', meaning: 'Le quota YouTube du jour ou le plafond IA du mois est utilisé à 80 % ou plus. Évite les recherches jusqu’à la remise à zéro.' },
      ]} />
      <p>Le <b>conseil du jour</b> se replie quand tu cliques sur <b>Lu, replier</b> ou sur son lien : il reste une ligne, avec <b>Relire</b> pour le rouvrir. Le lendemain, un nouveau conseil s’affiche en grand. Plus bas, l’<b>audience</b> de la semaine tient en une ligne ; le détail est dans Statistiques.</p>
    </Section>
    <Section id="a-faire" title="La liste « À faire »">
      <p>Sur l’accueil, « À faire maintenant » est classée <b>par impact</b> : en haut, ce qui fait le plus de bien au catalogue. Fais-la de haut en bas, chaque lien ouvre la bonne liste déjà filtrée.</p>
      <p>Une ligne disparaît quand son problème est réglé, pas quand tu l’as ouverte. <b>Catégories vides</b> reste tant qu’aucun outil de la catégorie n’a de code publié : une recherche range chaque code sous l’outil cité dans la vidéo, souvent un autre que celui cherché. Si elle ne trouve rien, ajoute d’autres outils connus de la catégorie.</p>
      <p>À droite, « Le parcours des codes » montre combien de codes sont à chaque étape. Juste en dessous, la carte <b>Oubi et Lili</b> présente les deux assistants IA à venir : Oubi, l’éclaireuse (Claude Haiku 5.5), repérera les codes dans les vidéos et les podcasts, Lili, la vérificatrice (Claude Opus 5.5), vérifiera chaque preuve et te préparera la décision. Ils ne sont pas encore actifs ; tu garderas toujours le dernier mot.</p>
    </Section>
    <Section id="consommation" title="La consommation des API">
      <p>Pour trouver et vérifier les codes, Merkod appelle des services extérieurs. L’onglet <b>Consommation</b> de Statistiques dit où tu en es (l’ancienne adresse /admin/consommation y mène toujours) :</p>
      <Legend rows={[
        { term: 'YouTube', meaning: <>10 000 unités gratuites par jour. Lire une vidéo ou une chaîne coûte 1 unité, une recherche 100. Le compteur repart de zéro vers 9 h, heure de Paris. YouTube ne donne pas ce chiffre : c’est Merkod qui compte chacun de ses appels.</> },
        { term: 'IA', meaning: <>La dépense du mois face au plafond (10 € par défaut), en euros comme le plafond. L’API est facturée en dollars : le montant en dollars est rappelé à côté. Une fois le plafond atteint, l’IA s’arrête jusqu’au 1er du mois suivant.</> },
      ]} />
      <Callout tone="tip">Au-dessus de 70 %, évite les grosses recherches par catégorie pour la journée : la lecture des vidéos proposées par les visiteurs a besoin du reste du quota.</Callout>
    </Section>
    <Section id="onglets" title="Les quatre onglets de Statistiques">
      <p>Statistiques se lit en quatre onglets : <b>Catalogue et audience</b> (l’état des codes et ce que font les visiteurs), <b>Sources et outils</b> (d’où viennent les codes et ce que les visiteurs copient), <b>Consommation</b> (quota YouTube et dépense IA) et <b>Vitesse</b> (ce que les visiteurs ressentent en chargeant les pages).</p>
    </Section>
    <Section id="vitesse" title="La vitesse ressentie">
      <p>L’onglet <b>Vitesse</b> montre, sur les 28 derniers jours, la part des visites où la page a été rapide, par type de page et par appareil (téléphone ou ordinateur). Les mesures viennent des vrais visiteurs, sans cookie ni identifiant : seulement un compteur par jour.</p>
      <Legend rows={[
        { term: 'Affichage', meaning: 'Le temps pour que le gros du contenu apparaisse (LCP). Bon sous 2,5 secondes.' },
        { term: 'Réactivité', meaning: 'Le délai entre un clic et la réponse de la page (INP). Bon sous 200 millisecondes.' },
        { term: 'Stabilité', meaning: 'Les sauts de mise en page pendant le chargement (CLS). Bon sous 0,1.' },
      ]} />
      <p>Une page est <b>rapide</b> quand au moins 75 % des visites sont bonnes sur les trois mesures, <b>lente</b> dès que plus d’un quart sont mauvaises. Sous 20 visites, le verdict attend d’avoir assez de mesures.</p>
      <Callout tone="tip">Regarde d’abord la ligne téléphone : c’est là que la plupart des visiteurs arrivent, et là que la lenteur se voit en premier.</Callout>
    </Section>
    <Section id="rendement" title="Le rendement par source">
      <p>Dans <b>Sources et outils</b>, chaque source a trois barres sur les 30 derniers jours :</p>
      <Legend rows={[
        { term: 'Trouvés', meaning: 'Les codes que la source a ajoutés en base, quel que soit leur statut.' },
        { term: 'Publiés', meaning: 'Parmi eux, ceux que tu as rendus visibles (vérifiés ou à tester).' },
        { term: 'Copiés', meaning: 'Les copies des visiteurs sur tous les codes venus de cette source, même plus anciens.' },
      ]} />
      <p>Une source qui trouve beaucoup mais publie peu te fait trier pour rien : resserre ses réglages. Celle qui fait le plus copier est à garder en marche en priorité. En dessous, <b>Copies par outil</b> et <b>Copies par catégorie</b> montrent ce que les visiteurs veulent vraiment.</p>
      <Callout tone="tip">Un outil en haut des copies doit toujours avoir un code vérifié : c’est là qu’un code mort déçoit le plus de monde.</Callout>
    </Section>
    <Section id="audience" title="L’audience">
      <p>Les statistiques d’audience (codes copiés, liens ouverts, recherches sans résultat) sont comptées <b>sans pistage</b> : de simples compteurs anonymes, aucun cookie publicitaire. C’est une promesse du site.</p>
      <Legend rows={[
        { term: 'Codes copiés', meaning: 'Le geste clé : un visiteur a trouvé ce qu’il cherchait.' },
        { term: 'Liens ouverts', meaning: 'Vers le créateur ou l’outil. C’est ce que tu montreras plus tard aux marques.' },
        { term: 'Recherches sans résultat', meaning: <>Les outils que les gens cherchent et que Merkod n’a pas. La meilleure liste des prochains outils à ajouter : le bouton <b>Ajouter cet outil</b> ouvre la fiche d’un nouvel outil avec le nom déjà rempli. Une fois l’outil ajouté (majuscules ou non), la ligne passe en fin de liste avec <b>Déjà ajouté</b>.</> },
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
        <div><dt>Affiliation</dt><dd>Le système de commission derrière ces codes. Plus tard, Merkod pourra en toucher aussi.</dd></div>
        <div><dt>Lien d’affiliation</dt><dd>Lien propre au créateur : la marque sait que le visiteur vient de lui.</dd></div>
        <div><dt>Source</dt><dd>La vidéo, l’épisode ou le post où le créateur donne le code. La preuve.</dd></div>
        <div><dt>Code mort</dt><dd>Code expiré ou désactivé. L’ennemi numéro 1 de la confiance.</dd></div>
        <div><dt>Doublon</dt><dd>Le même code, pour le même outil, déjà dans le catalogue.</dd></div>
        <div><dt>Couverture</dt><dd>Part des outils qui ont au moins un code visible. Dans Statistiques, le graphique « Couverture par catégorie » montre les 10 premières catégories ; « Voir les … catégories » les affiche toutes.</dd></div>
        <div><dt>Taux de conversion</dt><dd>Part des visiteurs qui font l’action voulue : copier un code, aller sur l’outil.</dd></div>
        <div><dt>Modération</dt><dd>Décider ce qui est publié et ce qui ne l’est pas.</dd></div>
        <div><dt>B2B</dt><dd>« Business to business » : l’offre future de Merkod pour les marques.</dd></div>
      </dl>
    </Section>
  </>;
}

function Administration() {
  return <>
    <Section id="quoi" title="Ce que tu contrôles ici">
      <p>La page <Link href="/admin/administration">Administration</Link> décide de ce que les visiteurs peuvent voir (tout le site, ou page par page) et qui peut entrer dans l’espace créateur. Elle ne sert pas à surveiller : Merkod n’y montre rien sur les visiteurs, et le journal ne note que tes propres gestes.</p>
    </Section>
    <Section id="maintenance" title="Mettre le site en pause">
      <p>Le <b>mode maintenance</b> remplace tout le site par une page d’attente « On range le comptoir ». Les moteurs de recherche reçoivent un code qui veut dire « revenez plus tard » : le site ne perd pas sa place dans Google pour une courte pause.</p>
      <p>Toi, connecté à l’admin, tu continues de voir le site normalement : pratique pour vérifier une mise à jour avant de rouvrir. Les propositions et les votes sont refusés pendant la pause ; la tâche de nuit, elle, continue.</p>
      <Callout tone="warn">Pense à rouvrir : tant que l’interrupteur est sur « En pause », plus aucun visiteur ne voit un code.</Callout>
    </Section>
    <Section id="liens" title="Relever ou non les liens d’affiliation">
      <p>L’interrupteur <b>Liens d’affiliation</b> décide de ce que l’IA garde quand elle lit une vidéo, un épisode ou une source à vérifier. Il est <b>coupé</b> au départ : l’IA ne relève que les <b>codes promo</b>, et les liens d’affiliation des descriptions sont ignorés.</p>
      <p>Allumé, l’IA relève aussi le lien de chaque offre : elle remplit <b>Lien de l’offre</b> à côté d’un code, et garde les offres données seulement par un lien (étiquette <b>Lien seul</b>), si une réduction est écrite. Elles arrivent en attente dans Vérifications, comme les codes.</p>
      <p>Le réglage vaut pour les prochaines lectures : chaînes suivies, podcasts, recherches par catégorie et analyses. Les offres déjà enregistrées restent. Une offre par lien que tu as ajoutée toi-même se vérifie toujours par son lien, et tu peux toujours remplir <b>Lien de l’offre</b> à la main sur un code.</p>
    </Section>
    <Section id="univers-site" title="Montrer ou cacher un univers">
      <p>Le tableau <b>Univers</b> liste les univers, leurs familles et leurs marques suivies. <b>Outils en ligne</b> est toujours visible : c’est la promesse du site. Les autres sont <b>cachés</b> au départ.</p>
      <p>Allumer un univers montre ses marques qui ont un code visible partout : Explorer, recherche, pages créateur, catégories et sitemap. L’éteindre les retire du site en quelques secondes, sans rien effacer. Sous le tableau, <b>Univers de chaque famille</b> change l’univers d’une famille entière.</p>
      <Callout tone="tip">Attends qu’un univers ait une trentaine de codes vérifiés avant de l’allumer : un rayon presque vide déçoit plus qu’il n’attire.</Callout>
    </Section>
    <Section id="pages" title="Couper une page">
      <p>Chaque page publique a son interrupteur. Une page coupée répond « page introuvable » (erreur 404), elle et tout ce qui est en dessous : couper « Pages de catégorie » coupe chaque page de catégorie (les pastilles de la page Codes restent). La page principale (la page Explorer, à l’adresse /) ne se coupe pas ; la « Présentation » (/about, l’ancienne page d’accueil), elle, peut être coupée. Elle disparaît en même temps du menu, du pied de page et de la recherche ; ailleurs, ses liens deviennent du texte simple et ses boutons disparaissent.</p>
      <Legend rows={SITE_PAGES.filter(page => !page.locked).map(page => ({ term: page.label, meaning: page.effect }))} />
      <p>Sur téléphone, chaque page devient une carte avec son interrupteur à droite du nom. Le changement s’applique en quelques secondes, sans redéploiement. Rallumer la page la remet en ligne de la même façon.</p>
      <Callout tone="rule">L’accueil, les mentions légales et la page confidentialité restent <b>toujours en ligne</b> : l’accueil est l’entrée du site, les deux autres sont obligatoires. Elles sont listées sans interrupteur.</Callout>
    </Section>
    <Section id="comptes" title="Gérer les comptes créateurs">
      <p>Un <b>compte créateur</b> naît la première fois qu’un créateur se connecte par e-mail à son espace. La liste montre seulement son e-mail, la page qu’il gère et sa dernière connexion : rien sur ce qu’il fait sur le site.</p>
      <Legend rows={[
        { term: 'Désactiver', meaning: 'Coupe sa session tout de suite et refuse ses connexions, jusqu’à ce que tu le réactives. Pour un compte suspect ou en litige.' },
        { term: 'Retirer l’accès', meaning: 'Le compte reste mais ne gère plus sa page. Pour une erreur d’attribution ou une chaîne qui change de main.' },
        { term: 'Supprimer', meaning: 'Efface son e-mail partout : compte, liens de connexion, revendications, journal. La page publique et les codes restent.' },
      ]} />
      <Callout tone="rule">Quand un créateur te demande d’effacer ses données (droit à l’effacement du RGPD), c’est <b>Supprimer</b> : tu as un mois pour le faire. S’il se reconnecte plus tard, un nouveau compte vide naît ; pour le bloquer, désactive-le plutôt.</Callout>
    </Section>
    <Section id="journal" title="Le journal">
      <p>Chaque geste fait ici (page coupée ou rallumée, pause, réouverture, liens d’affiliation allumés ou coupés, compte désactivé, réactivé ou supprimé) est noté avec sa date et son heure. Le journal garde 12 mois, puis s’efface tout seul chaque nuit. Il ne contient aucune donnée sur les visiteurs.</p>
    </Section>
  </>;
}

export const chapterContent: Record<string, () => ReactNode> = {
  introduction: Introduction,
  'se-reperer': SeReperer,
  'vie-d-un-code': VieDunCode,
  propositions: Propositions,
  codes: Codes,
  verifications: Verifications,
  podcasts: Podcasts,
  outils: Outils,
  createurs: Createurs,
  categories: Categories,
  sources: Sources,
  indicateurs: Indicateurs,
  routine: Routine,
  administration: Administration,
};
