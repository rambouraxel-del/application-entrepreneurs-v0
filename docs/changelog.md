# Changelog

## Étape 0 — Imprégnation du projet
Lecture et compréhension des documents de référence (charte de conception, charte technique, cahier des charges V0, étapes de développement V0). Aucun fichier créé.

## Étape 1 — Socle technique
Création de l'arborescence du projet `Application-Entrepreneurs-V0/` : dossiers `css/`, `js/`, `pages/`, `components/`, `assets/`, `docs/`, fichiers de base (pages placeholder, `styles.css`, `app.js` vides), et documentation (README de chaque dossier, `PROJECT_INDEX.md`, `README.md` principal).

## Étape 2 — Page de connexion fictive
Création de la page de connexion fictive (`pages/login.html`) : nom provisoire "Cockpit Entrepreneur", phrase d'accueil, champs e-mail et mot de passe fictifs, bouton "Se connecter" et lien fictif "Mot de passe oublié ?". `index.html` redirige désormais automatiquement vers `pages/login.html`. Le bouton "Se connecter" redirige vers `pages/dashboard.html` (toujours un placeholder) via `js/app.js`. Ajout des styles correspondants dans `css/styles.css`.

## Étape 3 — Structure générale et navigation par onglets
Ajout d'une barre d'onglets supérieure commune (Tableau de bord, Clients, Agenda, Facturation, Base de données, Paramètres) sur les six pages principales (`pages/dashboard.html`, `pages/clients.html`, `pages/agenda.html`, `pages/facturation.html`, `pages/database.html`, `pages/settings.html`). Navigation par simples liens HTML, sans JavaScript. Onglet actif identifié par une classe CSS (`tab-active`) propre à chaque page. Ajout des styles correspondants (`.tabs`, `.tab`, `.tab-active`, `.page-content`) dans `css/styles.css`. Pages toujours sous forme de placeholders simples.

## Étape 4 — Squelette du tableau de bord
Structuration de `pages/dashboard.html` en sept zones : KPI principaux (4 emplacements), priorité du jour, agenda du jour, to-do list, alertes importantes, notifications, indicateurs favoris (4 emplacements). Disposition : KPI en haut, priorité en pleine largeur, agenda/to-do côte à côte, alertes/notifications côte à côte, indicateurs favoris en bas. Chaque zone ne contient qu'un titre et, pour les blocs non-KPI, un texte temporaire "Contenu à définir à l'étape suivante." Ajout des styles correspondants (`.dashboard-kpis`, `.dashboard-card`, `.dashboard-block`, `.dashboard-row`, `.dashboard-favorites`, `.dashboard-priority`) dans `css/styles.css`. Aucune donnée fictive détaillée, aucune couleur d'état.

## Étape 5 — Enrichissement visuel du tableau de bord
Ajout de données fictives réalistes dans les sept zones de `pages/dashboard.html` : valeurs et variations pour les 4 KPI, priorité du jour ("Relancer le devis Martin"), 3 rendez-vous fictifs pour l'agenda, 4 tâches fictives pour la to-do list (2 marquées terminées visuellement), 4 alertes fictives avec niveaux de gravité, un bloc notifications fictif, et des valeurs pour les 4 indicateurs favoris. Ajout des classes de statut (`status-positive`, `status-negative`, `status-neutral`, `alert-critical`, `alert-warning`, `alert-info`) et des styles associés (valeurs KPI, listes, badges) dans `css/styles.css`. Structure et disposition de l'étape 4 conservées sans modification.

## Étape 6 — Pages secondaires fictives
Enrichissement des cinq pages secondaires avec du contenu fictif crédible :
- `pages/clients.html` : en-tête avec bouton fictif "Ajouter un client", barre de recherche fictive, tableau de 4 clients fictifs (nom, entreprise, téléphone, e-mail en `@example.com`, dernier contact, statut en badge).
- `pages/agenda.html` : en-tête avec bouton fictif "Ajouter un rendez-vous", liste de 4 rendez-vous fictifs de la journée (réutilise le style `.agenda-list` du tableau de bord).
- `pages/facturation.html` : en-tête avec boutons fictifs "Créer une facture" et "Créer un devis", tableau de 5 documents fictifs (devis/factures) avec statuts en badges colorés.
- `pages/database.html` : 6 cartes représentant les bases centrales (Clients, Produits/Services, Factures, Devis, Rendez-vous, Tâches) avec un nombre fictif d'éléments chacune.
- `pages/settings.html` : 6 sections fictives (Informations de l'entreprise, Préférences d'affichage, Notifications, Compte utilisateur, Objectifs mensuels, Sécurité), chacune avec un bouton fictif "Modifier".

Tous les boutons fictifs de cette étape portent la classe commune `btn-wip`, sans aucune action réelle (ni lien, ni JavaScript), afin d'être reliés au pop-up "Work in progress" à l'étape 7. Ajout des styles correspondants (`.page-header`, `.btn-secondary`, `.search-bar`, `.data-table`, `.badge` et ses variantes, `.database-grid`, `.settings-grid`) dans `css/styles.css`. Aucune fonctionnalité réelle développée.

## Étape 7 — Pop-up "Work in progress"
Ajout d'un pop-up centralisé "Work in progress" (titre + message "Cette fonctionnalité sera développée dans une prochaine version." + bouton "Fermer"), généré dynamiquement en JavaScript dans `js/app.js` (aucune duplication de structure HTML dans les pages). Un seul écouteur d'événement global détecte les clics sur tout élément portant la classe `btn-wip` et ouvre le pop-up ; fermeture possible via le bouton "Fermer", un clic sur le fond assombri, ou la touche Échap. Le lien "Mot de passe oublié ?" de `pages/login.html` a reçu la classe `btn-wip` et est désormais relié au même comportement (son `href="#"` est neutralisé par `preventDefault()`). Ajout de la balise `<script src="../js/app.js">` sur `pages/clients.html`, `pages/agenda.html`, `pages/facturation.html` et `pages/settings.html` (pages contenant des éléments `btn-wip`) ; `pages/dashboard.html` et `pages/database.html` non modifiées car elles ne contiennent aucun élément `btn-wip`. Ajout des styles du pop-up (`.wip-overlay`, `.wip-modal`, `.wip-title`, `.wip-message`, `.wip-close`) dans `css/styles.css`. Le bouton "Se connecter" et les onglets de navigation restent inchangés et fonctionnent normalement.

## Étape 8 — Harmonisation visuelle générale
Audit complet de `css/styles.css` et des 7 pages, puis corrections ciblées sans changement de structure ni de données :
- Correction d'un bug de spécificité CSS : `.page-subtitle` était silencieusement écrasé par la règle `.page-content p` (15px au lieu des 14px prévus) ; la sélection a été renforcée (`.page-content .page-subtitle`) pour que la taille voulue s'applique réellement.
- Harmonisation de `.btn-primary` et `.btn-secondary` : même taille de police (14px) et même gabarit de padding (`10px 20px`), tout en conservant une distinction visuelle claire (fond bleu plein + `font-weight: 600` pour le bouton principal, contour bleu + `font-weight: 500` pour le secondaire).
- Ajout de `font-weight: 600` explicite à `.dashboard-block h2`, pour que les titres de blocs (Agenda, To-do list, Alertes, Notifications, Priorité du jour, sections Paramètres) aient le même poids visuel que les titres de cartes KPI/favoris/base de données.
- Suppression de la duplication de la règle de largeur du tableau de bord : `.page-content.dashboard` et `.page-content.wide` définissaient la même valeur (1100px) ; seule `.wide` porte désormais cette règle. `pages/dashboard.html` utilise maintenant `class="page-content dashboard wide"` — la classe `dashboard` est conservée comme repère de contexte pour d'éventuels styles futurs, sans porter elle-même de largeur.
- Ajout d'un état `:focus` cohérent sur le champ de recherche fictif (`.search-bar input`), identique à celui des champs de connexion.
- Harmonisation de l'espacement de la barre de recherche (`margin-bottom` 20px → 24px) pour respecter le rythme vertical de 24px utilisé partout ailleurs.
- Unification de l'ombre des deux "panneaux proéminents" de l'application (`.login-card` et `.wip-modal`) sur une seule valeur partagée.

Aucune fonctionnalité, donnée fictive ou structure de page modifiée. Bouton "Se connecter", onglets de navigation, disposition du tableau de bord et comportement du pop-up "Work in progress" vérifiés après coup et toujours fonctionnels.

## Étape 9 — Tests de navigation et corrections
Vérification systématique de l'ensemble du prototype (`index.html` et les 7 pages) par relecture de code et scripts de contrôle automatisés, en l'absence d'accès à un navigateur réel dans cet environnement :
- Tous les liens `href`/`src` (feuille de style, script, onglets, redirection) résolvent vers un fichier existant — aucun lien cassé.
- Les 6 pages principales partagent exactement les mêmes 6 onglets, dans le même ordre, avec la classe `tab-active` correctement positionnée sur l'onglet de la page courante.
- Les 11 éléments `btn-wip` attendus sont bien présents et répartis comme prévu (Connexion : 1, Clients : 1, Agenda : 1, Facturation : 2, Paramètres : 6 ; Tableau de bord et Base de données : 0, cohérent avec l'absence de bouton fictif sur ces pages).
- `js/app.js` est chargé exactement sur les 5 pages qui en ont besoin (Connexion, Clients, Agenda, Facturation, Paramètres) et absent des 2 pages qui n'en ont pas besoin (Tableau de bord, Base de données).
- Relecture de la logique JavaScript du pop-up : pas de conflit entre le bouton "Se connecter", les onglets et le système `btn-wip` ; le bouton "Fermer" du pop-up ne porte pas la classe `btn-wip` (pas de réouverture accidentelle) ; la fermeture par clic extérieur ne déclenche pas non plus le système `btn-wip`.
- Aucun identifiant HTML (`id`) dupliqué au sein d'une même page.
- Aucun texte temporaire ("Page en préparation", "Contenu à définir...") oublié sur une page censée être enrichie.

**Aucune correction n'a été nécessaire** : aucun problème réel n'a été détecté sur les points vérifiés. Quelques classes CSS "de contexte" sans style propre (`dashboard-agenda`, `dashboard-alerts`, `dashboard-notifications`, `dashboard-todo`, `database-card`) ont été relevées ; elles n'ont aucun impact visuel (le style vient de `.dashboard-block`/`.dashboard-card`) et n'ont donc pas été modifiées.

Points nécessitant une confirmation visuelle par le chef de projet dans un navigateur réel : rendu effectif du parcours complet, ouverture/fermeture du pop-up (bouton, clic extérieur, touche Échap), absence de débordement visuel dans les tableaux avec les e-mails fictifs les plus longs.

## Étape 10 — Livraison propre de la V0
Finalisation de la documentation du projet, sans aucune modification du prototype (HTML/CSS/JS) :
- `README.md` (racine) entièrement réécrit pour refléter l'état final livré : résumé complet de ce qui a été développé, instructions d'ouverture et de test, limites de la V0, suggestions d'amélioration non appliquées et points à prévoir pour la V1, ces deux dernières sections étant clairement séparées du contenu réellement livré.
- `PROJECT_INDEX.md` mis à jour avec l'arborescence finale annotée et une note explicative sur les dossiers `components/` et `assets/`, restés vides dans cette V0 statique.
- `pages/README.md` corrigé : il décrivait encore les pages comme de simples placeholders "à développer" alors qu'elles sont enrichies depuis les étapes 2 à 6 — incohérence manifeste, corrigée.
- `js/README.md` corrigé : il présentait la navigation et le pop-up comme des logiques "à venir" alors qu'elles sont implémentées depuis les étapes 2 et 7 — incohérence manifeste, corrigée.
- `docs/decisions.md` non modifié : aucune nouvelle décision de conception n'a été prise à cette étape, uniquement de la documentation.

La V0 est considérée comme livrée à l'issue de cette étape.

## V0.1 — Refonte graphique globale
Refonte esthétique et ergonomique complète de l'interface, sans nouvelle fonctionnalité métier, sans suppression de donnée fictive, à partir d'une maquette de référence (sidebar sombre + tableau de bord moderne façon SaaS) :

- **Sauvegarde préalable** : copie intégrale du projet dans `backup-v0-before-v0-1-refonte-graphique/` (dossier frère), avant toute modification.
- **`css/styles.css`** entièrement réécrit : introduction de variables CSS (`:root`) pour centraliser couleurs/ombres/rayons, remplacement du bleu unique par une palette indigo/violet à plusieurs teintes pour les accents décoratifs, nouveau système de mise en page `.app-shell`/`.sidebar`/`.main`/`.topbar` remplaçant l'ancienne barre d'onglets supérieure (`.tabs`/`.tab`/`.tab-active`, supprimées), cartes KPI avec icônes, alertes/agenda restylés en blocs colorés, ajout de media queries pour tablette et mobile.
- **`pages/dashboard.html`** (priorité de la refonte) : nouvelle sidebar (5 liens + icônes SVG), nouvelle topbar (message de bienvenue fictif "Bonjour, Julien !", recherche, cloche de notifications, roue crantée), cartes KPI avec icônes et valeurs plus visibles, blocs Agenda/To-do/Alertes redessinés, ajout d'un graphique fictif statique "Évolution du CA" (SVG dessiné à la main, aucune donnée réelle ni calcul), résumé mensuel (anciens indicateurs favoris) restylé avec icônes.
- **`pages/clients.html`, `agenda.html`, `facturation.html`, `database.html`, `settings.html`** : même sidebar et topbar appliquées, contenu fonctionnel et données fictives strictement conservés, boutons et tableaux restylés selon la nouvelle charte.
- **Paramètres** retiré des liens principaux de la sidebar et déplacé en icône transversale (roue crantée) dans la topbar de toutes les pages ; la page `settings.html` reste pleinement accessible et met la roue crantée en surbrillance pour indiquer la position actuelle.
- **`pages/login.html`** : non restructurée (hors périmètre de la maquette, qui concerne l'espace post-connexion) ; bénéficie uniquement de la nouvelle palette indigo via les variables CSS partagées.
- **`js/app.js`** : **aucune modification nécessaire** (vérifié par comparaison avec la sauvegarde) — la délégation d'événements sur `.btn-wip` fonctionne à l'identique avec la nouvelle structure HTML.
- Aucune entrée de sidebar supplémentaire (Trésorerie, Produits/Services, Finance, Statistiques) n'a été ajoutée : ces modules sont explicitement hors périmètre de la V0.1.

Vérifications effectuées après la refonte (par relecture de code, sans navigateur disponible dans cet environnement) : tous les liens/chemins résolvent, la sidebar affiche le bon lien actif sur chacune des 5 pages principales, aucun lien actif sur `settings.html` (conforme à la décision de la retirer de la navigation principale), 19 éléments `btn-wip` répartis de façon cohérente sur les 7 pages, aucun identifiant HTML dupliqué, CSS syntaxiquement valide.

## V0.1.1 — Corrections ciblées du tableau de bord
Passe corrective sur `pages/dashboard.html` et `css/styles.css` uniquement, pour rapprocher le rendu de la maquette de référence, sans nouvelle fonctionnalité ni donnée fictive supprimée :

- **Suppression du widget "Notifications"** du tableau de bord ; l'information reste portée uniquement par la cloche + badge rouge de la topbar (déjà en place depuis la V0.1).
- **Fusion de "Priorité du jour" dans la To-do list** : "Relancer le devis Martin" devient le premier élément de la to-do list, mis en avant par un fond teinté et un badge "Priorité du jour", au lieu d'un bloc plein-large séparé qui déséquilibrait la grille.
- **Nouvelle disposition à 3 colonnes** (`dashboard-row-3`) : Agenda du jour / To-do list / Alertes importantes sur une seule rangée, remplaçant les deux anciennes rangées de 2. Dégradation responsive en 2 colonnes (≤1100px) puis 1 colonne (≤900px, règle déjà existante).
- **Agenda du jour** : chaque rendez-vous devient un bloc teinté avec bordure colorée à gauche (3 teintes tournantes indigo/violet/bleu, aucune couleur réservée aux statuts).
- **To-do list** : vraies cases à cocher visuelles (non interactives), badges de priorité réutilisant les badges existants (`badge-danger`/`badge-warning`/`badge-neutral`/`badge-success`), séparation par espacement/fond au survol plutôt que par lignes.
- **Alertes importantes** : chaque alerte devient une carte avec icône ronde colorée selon le type (horloge/triangle/calendrier), titre, sous-texte (le sous-texte de l'alerte "facture en retard" reprend désormais le montant réel de FAC-001 déjà affiché sur la page Facturation, pour plus de cohérence inter-pages) et chevron.
- **Sélecteur de date fictif** ajouté dans la topbar du tableau de bord uniquement (relié au pop-up "Work in progress", comme les autres éléments non fonctionnels) — non étendu aux autres pages à ce stade, décision explicitement validée pour rester dans un périmètre correctif ciblé.
- **Sidebar** : léger affinage (logo légèrement agrandi, séparateur discret sous le bloc marque, espacement des liens un peu plus généreux), sans changement d'identité.
- **Nettoyage** : suppression des règles CSS devenues orphelines (`.dashboard-notifications`, `.dashboard-priority`, `.priority-text`, `.notifications-count`).
- **`js/app.js`** : aucune modification.

Vérifications effectuées : liens/chemins valides, aucun identifiant dupliqué, CSS syntaxiquement valide (155 accolades ouvrantes/fermantes équilibrées), 19 éléments `btn-wip` correctement répartis (dashboard passe de 3 à 4 avec l'ajout du sélecteur de date). Test visuel réel dans Chrome tenté mais bloqué par la politique de navigation de l'extension (accès `file://` et `localhost` tous deux refusés) — un serveur HTTP local de secours (PowerShell, `http://localhost:8834/`) a été mis en place pour permettre au chef de projet de vérifier lui-même le rendu sans workaround supplémentaire côté agent.

**V0.1.1 validée par le chef de projet.** Points restants non bloquants, reportés au backlog (`docs/backlog.md`) : suppression/refonte de la page Base de données, harmonisation du sélecteur de date sur toutes les pages, amélioration plus poussée du widget Agenda, évolution fonctionnelle des modules, travail futur sur l'identité/logo.

## V0.1.2 — Structuration technique et documentation projet
Étape purement technique et documentaire, sans aucune modification du prototype (HTML/CSS/JS inchangés) :

- **Initialisation d'un dépôt Git local** à la racine de `Application-Entrepreneurs-V0/` (le projet n'était pas versionné jusque-là). Identité configurée localement au dépôt : Axel Rambour / rambour.axel@gmail.com.
- **Premier commit** (`v0.1.1 - refonte graphique stabilisée`) figeant l'état validé de la V0.1.1, puis **tag `v0.1.1`** sur ce commit.
- **`.gitignore`** créé : exclut les dossiers de sauvegarde (`backup-*/`), les fichiers système, les fichiers temporaires, les futurs fichiers d'environnement et dépendances.
- **`docs/roadmap-v0bis.md`** créé : phases V0.1 à V1, avec leur statut (validée / en cours / à venir).
- **`docs/backlog.md`** créé : idées et pistes non traitées, classées par thème, reprenant notamment les points laissés en suspens à la validation de la V0.1.1.
- **`docs/versioning.md`** créé : convention de nommage des versions (V0.x / V0.x.x), logique de commit/tag/branche, distinction version validée / en chantier.
- **Second commit** (`v0.1.2 - structuration technique et documentation projet`) regroupant ces nouveaux documents et les mises à jour de `README.md`, `docs/changelog.md` et `docs/decisions.md`.
- **Dépôt GitHub distant** : non créé à ce stade (`gh` non installé sur la machine, et aucune tentative de création automatique n'a été faite). Procédure manuelle documentée pour le chef de projet.

Git/GitHub deviennent à partir de cette étape la méthode de suivi recommandée pour le projet, en remplacement des sauvegardes manuelles de dossier utilisées jusqu'ici.

**V0.1.2 validée par le chef de projet.** Dépôt GitHub privé créé et `main` poussé avec le tag `v0.1.1` par le chef de projet lui-même.

## V0.2 — Navigation et architecture générale
Réalisée sur la branche dédiée `v0.2-navigation-architecture` (créée depuis `main`, non fusionnée à ce stade). Objectif : clarifier l'organisation de la navigation principale, sans développement fonctionnel :

- **"Base de données" retirée de la sidebar principale** sur les 6 pages qui la contenaient (`dashboard.html`, `clients.html`, `agenda.html`, `facturation.html`, `database.html`, `settings.html`). Le fichier `pages/database.html` n'est pas supprimé : il conserve sa sidebar/topbar pour rester cohérent si on y accède directement, mais devient orpheline (plus aucune page ne pointe vers elle), à l'image du traitement déjà appliqué à `settings.html` depuis la V0.1.
- **Trois nouveaux modules ajoutés à la sidebar**, dans l'ordre : Tableau de bord, Clients, Agenda, Facturation, **Trésorerie**, **Produits / Services**, **Finance** (7 liens au total).
- **`pages/tresorerie.html`** créée : 4 cartes KPI (Solde disponible, Dépenses du mois, Recettes du mois, Échéances à venir) + bannière "Module en construction".
- **`pages/produits-services.html`** créée : bouton fictif "Ajouter un produit" (`btn-wip`), tableau fictif de 4 produits/services (nom, type, prix, marge estimée, ventes) + bannière "Module en construction".
- **`pages/finance.html`** créée : 4 cartes KPI (Chiffre d'affaires, Marge, Objectif mensuel, Résultat estimé), 3 zones fictives (Bilan prévisionnel, Compte de résultat, Objectifs financiers) + bannière "Module en construction".
- **Nouveau composant CSS `.construction-banner`** (bordure en pointillés, icône, texte) réutilisé sur les 3 nouvelles pages ; **`.placeholder-grid`** ajouté pour la grille à 3 zones de la page Finance.
- **Paramètres et notifications inchangés** : roue crantée et cloche toujours présentes en topbar sur toutes les pages, y compris les 3 nouvelles.
- **Sélecteur de date** non étendu : reste réservé au tableau de bord, conformément à la décision de la V0.1.1.
- **Statistiques / Pilotage** volontairement non ajouté à la sidebar — reste au backlog.
- **`js/app.js`** : aucune modification (la délégation `.btn-wip` fonctionne automatiquement sur les nouvelles pages).
- **Roadmap clarifiée** : une note dans `docs/roadmap-v0bis.md` précise que Trésorerie/Produits-Services/Finance ne sont que des portes d'entrée en V0.2 ; leur développement fonctionnel réel reste prévu en V0.7/V0.8/V0.9.

Vérifications effectuées : tous les liens/chemins résolvent (aucun lien mort), les 9 pages avec sidebar (dashboard, clients, agenda, facturation, database, settings, tresorerie, produits-services, finance) affichent exactement 7 liens chacune, l'onglet actif est correct sur les 7 pages concernées et absent sur `database.html`/`settings.html` (cohérent avec leur statut hors navigation principale), aucun identifiant HTML dupliqué, CSS syntaxiquement valide (162 accolades ouvrantes/fermantes équilibrées), aucun ancien lien vers `database.html` restant.

Commit créé sur la branche `v0.2-navigation-architecture` : `v0.2 - navigation et architecture générale`. Pas de merge dans `main`, pas de tag, pas de push — décision laissée à la revue humaine.

**V0.2 validée par le chef de projet.** Fusionnée dans `main` (fast-forward), taguée `v0.2`, poussée sur GitHub avec le tag.

## V0.3 — Tableau de bord : hub de navigation et interactions de base
Réalisée sur la branche dédiée `v0.3-dashboard-hub` (créée depuis `main`, non fusionnée à ce stade). Objectif : connecter le tableau de bord déjà existant aux modules posés en V0.2, sans nouvelle fonctionnalité métier. Seul `pages/dashboard.html` (contenu) et `css/styles.css` (styles additifs) ont été modifiés :

- **4 KPI principaux rendus cliquables** : CA du jour → `finance.html`, CA du mois → `finance.html`, Objectif mensuel → `finance.html`, Trésorerie disponible → `tresorerie.html`.
- **4 alertes importantes rendues cliquables** : Facture en retard → `facturation.html`, Stock faible → `produits-services.html`, Objectif mensuel en retard → `finance.html`, Rendez-vous important → `agenda.html`.
- **3 cartes du résumé mensuel rendues cliquables** : Clients ce mois-ci → `clients.html`, Devis envoyés → `facturation.html`, Dépenses du mois → `tresorerie.html`. "Tâches terminées" reste non cliquable (aucun module Tâches dédié).
- **2 tâches de la to-do list rendues cliquables** : "Relancer le devis Martin" (priorité du jour) → `clients.html`, "Préparer la facture n°001" → `facturation.html`. "Appeler le fournisseur Dupont" reste non cliquable (aucun module Fournisseurs), les 2 tâches déjà cochées restent non cliquables (actions passées).
- **"Voir l'agenda"** vérifié : pointait déjà vers `agenda.html` depuis la V0.1.1, aucun changement nécessaire.
- **Nouveau bouton "Personnaliser les indicateurs"** ajouté au-dessus de la grille des 4 KPI principaux, en Work in progress (`btn-wip`) — prépare l'idée sans développer la fonctionnalité.
- **Indications visuelles de clic ajoutées**, additives uniquement (aucune modification des règles de base `.dashboard-card`, `.kpi-card`, `.alert-item`) : `.kpi-card-link` (chevron discret en survol via `::after`, légère ombre), `.alert-item` (assombrissement léger au survol), `.todo-item-link` (soulignement du titre au survol). Curseur pointer sur tous les éléments cliquables.
- **Design V0.1.1 non modifié** : aucune structure, couleur, sidebar, topbar ou espacement changé — uniquement des classes additives et des balises `<div>`/`<li>` transformées en `<a>` sans changement de mise en page.
- **"Base de données" non réintroduite** : vérifié, aucune mention ni lien vers `database.html` sur le tableau de bord.
- **`js/app.js`** : aucune modification (les nouveaux liens réels ne nécessitent aucun JavaScript ; la délégation `.btn-wip` reste inchangée pour les éléments encore en Work in progress).

Vérifications effectuées : tous les liens/chemins du projet résolvent (aucun lien mort, toutes pages confondues), CSS syntaxiquement valide (170 accolades équilibrées), balises HTML équilibrées sur `dashboard.html` (div, a, li, ul, section), aucun identifiant dupliqué, exactement 3 éléments `href="#"` restants sur le tableau de bord — tous portant `btn-wip` ("Personnaliser les indicateurs", "Ajouter une tâche", "Voir toutes") —, aucun des nouveaux liens réels ne porte la classe `btn-wip`.

Commit créé sur la branche `v0.3-dashboard-hub` : `v0.3 - tableau de bord hub de navigation`. Pas de merge dans `main`, pas de tag, pas de push — décision laissée à la revue humaine.
