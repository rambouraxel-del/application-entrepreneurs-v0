# Décisions importantes

## Emplacement du projet
Le dossier `Application-Entrepreneurs-V0/` a été créé dans `Dossier Développement Claude Code`, le répertoire de travail dédié au développement, distinct des dossiers `Chartes` et `V0` qui contiennent les documents de référence.

## Technologie
Le projet reste en HTML/CSS/JavaScript natif, sans framework ni dépendance externe, conformément à la règle de simplicité de la V0.

## Arborescence
L'arborescence proposée initialement a été validée sans adaptation.

## Page de connexion (étape 2)
- `index.html` reste le point d'entrée technique du prototype et redirige automatiquement vers `pages/login.html`, qui est la vraie page de connexion fictive. Cela évite de dupliquer le contenu de connexion à deux endroits.
- Nom provisoire de l'application retenu : "Cockpit Entrepreneur".
- Le lien "Mot de passe oublié ?" est intégré à titre visuel uniquement, sans action réelle.
- "Créer un compte" / "Demander un accès" ne sont pas intégrés à cette étape.

## Structure générale et navigation par onglets (étape 3)
- Navigation par simples liens HTML entre les pages de `pages/`, sans JavaScript : solution la plus simple et la plus fiable pour une V0 statique en HTML/CSS/JS natif.
- La barre d'onglets est dupliquée dans les six fichiers HTML des pages principales. **Ceci est une décision temporaire propre à la V0**, acceptée uniquement parce que le projet reste une V0 statique simple sans système de composants ni de templates. Ce choix devra être réétudié si le projet évolue vers une architecture avec composants réutilisables (par exemple lors du passage à la V1), afin d'éviter la duplication durable d'un même élément d'interface, conformément au principe de non-duplication de la charte technique.
- Pas de zone supérieure secondaire (bandeau de titre/contexte) à cette étape : le titre `<h1>` de chaque page suffit à indiquer la position de l'utilisateur.

## Squelette du tableau de bord (étape 4)
- Les emplacements d'indicateurs favoris sont nommés de façon neutre ("Indicateur 1" à "Indicateur 4") plutôt qu'avec des exemples concrets, afin de ne pas anticiper le contenu détaillé prévu à l'étape 5.
- Agenda du jour / To-do list et Alertes / Notifications sont disposés en grille à deux colonnes égales ; cette disposition reste simple (CSS Grid natif, sans media query) et pourra être affinée pour le responsive plus tard si nécessaire.

## Enrichissement visuel du tableau de bord (étape 5)
- La to-do list ne reprend pas "Relancer le devis Martin" parmi les tâches, puisque cette action est déjà affichée comme priorité du jour ; deux autres tâches ("Vérifier les stocks", "Envoyer la relance client Bernard") sont affichées comme terminées à la place, pour éviter toute incohérence entre une action présentée comme priorité et comme tâche déjà faite.
- Les tâches terminées sont simulées par un style visuel (texte barré + coche décorative en CSS `::before`), sans case à cocher HTML interactive, afin de ne donner aucune impression de liste modifiable.
- Les cartes d'indicateurs favoris utilisent une bordure fine sans ombre (au lieu de l'ombre des cartes KPI) pour rester visuellement moins prioritaires, conformément à la hiérarchie demandée, sans changer la structure de grille validée à l'étape 4.
- Les couleurs de statut (vert, rouge, orange, gris/bleu) ne sont utilisées que sur les éléments concernés (variations KPI, alertes) et nulle part ailleurs dans l'interface.

## Pages secondaires fictives (étape 6)
- Toutes les coordonnées fictives (e-mails) utilisent le domaine `example.com`, réservé aux usages documentaires, afin d'éviter toute ressemblance avec de vraies coordonnées. Les numéros de téléphone suivent une numérotation séquentielle clairement fictive (01 23 45 67 89, 02 34 56 78 90, etc.).
- Tous les boutons fictifs ("Ajouter un client", "Ajouter un rendez-vous", "Créer une facture", "Créer un devis", "Modifier" sur chaque section Paramètres) portent la classe commune `btn-wip`, sans action réelle, afin d'être reliés au pop-up "Work in progress" à l'étape 7 sans réécriture du HTML à ce moment-là.
- La page Base de données ne comporte aucun bouton d'action, conformément à sa vocation de simple aperçu des données centrales, non d'un espace de gestion.
- Réutilisation des classes déjà existantes (`.dashboard-block`, `.dashboard-card`, `.agenda-list`, `.favorite-value`) sur les pages secondaires plutôt que la création de nouvelles classes équivalentes, conformément au principe de non-duplication de la charte technique.

## Pop-up "Work in progress" (étape 7)
- Contrairement à la duplication acceptée pour la barre d'onglets (étape 3), la structure HTML du pop-up n'est **pas** dupliquée dans les pages : elle est générée dynamiquement par `js/app.js` et injectée une seule fois dans la page au premier clic sur un élément `btn-wip`. Le texte, la structure et le comportement du pop-up n'existent donc qu'à un seul endroit dans le projet.
- Le lien "Mot de passe oublié ?" (page de connexion), jusque-là purement visuel sans aucune réaction au clic, est désormais relié au même système `btn-wip` : il ouvre le pop-up au lieu de faire remonter la page en haut. Cela ne change pas sa nature non fonctionnelle, mais donne un retour clair à l'utilisateur.
- La balise `<script src="../js/app.js">` n'a été ajoutée qu'aux pages contenant réellement un élément `btn-wip` (Clients, Agenda, Facturation, Paramètres, Connexion) ; le Tableau de bord et la Base de données n'en ont pas besoin puisqu'ils ne contiennent aucun bouton fictif.

## Harmonisation visuelle générale (étape 8)
- `pages/dashboard.html` porte désormais `class="page-content dashboard wide"` : la classe `dashboard` reste comme repère de contexte réservé à d'éventuels styles futurs propres au tableau de bord, mais elle ne porte plus la largeur (fournie uniquement par `.wide`), pour supprimer la duplication de règle entre `.page-content.dashboard` et `.page-content.wide`.
- Les boutons `.btn-primary` et `.btn-secondary` partagent désormais la même taille et le même gabarit, mais restent distinguables grâce à la couleur de fond (plein vs contour) et au poids de police (600 vs 500), conformément à la demande de conserver une hiérarchie visuelle claire entre action principale et secondaire.
- `.login-card` et `.wip-modal`, tous deux des panneaux centrés proéminents, partagent désormais la même valeur d'ombre plutôt que deux intensités différentes.
- Le correctif de spécificité sur `.page-subtitle` ne change pas le contenu affiché, seulement sa taille réelle (14px au lieu de 15px par erreur) : aucun impact sur les données ou la structure des pages.

## Refonte graphique globale — V0.1
- **Sauvegarde préalable obligatoire** : le projet ne dispose pas de dépôt Git, donc une copie complète du dossier (`backup-v0-before-v0-1-refonte-graphique/`) a été créée avant toute modification, pour permettre un retour arrière manuel si nécessaire.
- **Abandon de la navigation par onglets supérieurs au profit d'une sidebar** : ce changement structurel majeur remplace entièrement `.tabs`/`.tab`/`.tab-active` (supprimées du CSS) par `.sidebar`/`.sidebar-link`/`.sidebar-link-active`. Le choix reste conforme à la charte technique (composants standardisés, un seul système de navigation actif à la fois, pas de double logique).
- **`js/app.js` est désormais chargé sur les 7 pages** (y compris Tableau de bord et Base de données), car chacune contient maintenant une cloche de notifications `btn-wip` dans sa topbar. Cela annule la décision de l'étape 7 qui limitait le chargement du script aux pages contenant un bouton fictif — la situation a changé, la règle reste la même (charger le script uniquement là où `btn-wip` est présent), simplement `btn-wip` est désormais partout.
- **Paramètres retiré de la navigation principale** : conformément à la mission V0.1, l'accès à `settings.html` passe désormais uniquement par l'icône "roue crantée" de la topbar (lien réel, fonctionnel), présente sur toutes les pages. Aucun lien de la sidebar n'est actif sur `settings.html` ; c'est l'icône roue crantée elle-même qui est mise en surbrillance sur cette page.
- **Nouveau lien réel ajouté** : "Voir l'agenda" (bloc Agenda du jour du tableau de bord) pointe vers `agenda.html` — ce n'est pas une nouvelle fonctionnalité mais un raccourci vers une page déjà existante et déjà accessible depuis la sidebar.
- **Graphique "Évolution du CA"** : SVG statique dessiné à la main (polyline + zone de dégradé), sans aucun calcul ni donnée réelle, ajouté uniquement pour se rapprocher visuellement de la maquette. Il ne constitue pas un système de statistiques.
- **Icônes** : toutes les icônes (sidebar, topbar, cartes KPI) sont du SVG inline écrit à la main, sans bibliothèque ni police d'icônes, conformément à la règle de simplicité et d'absence de dépendance externe.
- **Aucune entrée de sidebar supplémentaire** (Trésorerie, Produits/Services, Finance, Statistiques) n'a été créée : ces modules sont explicitement listés comme hors périmètre par la mission V0.1, la maquette servant uniquement de référence graphique et non de spécification fonctionnelle complète.
- **Variables CSS introduites** (`:root` avec couleurs, ombres, rayons) pour centraliser la charte graphique et faciliter d'éventuels ajustements futurs, conformément au principe de factorisation demandé et à la charte technique (styles centralisés, dissociés de la logique).

## Corrections ciblées du tableau de bord — V0.1.1
- **Sélecteur de date limité au tableau de bord** : décision explicitement validée par le chef de projet pour rester dans un périmètre correctif ciblé ; son extension aux autres pages (harmonisation complète de la topbar) est reportée à une itération future.
- **Fusion Priorité du jour / To-do list** : plutôt que de garder deux sources d'information séparées pour une action qui est fondamentalement une tâche, "Relancer le devis Martin" devient le premier élément (mis en avant visuellement) de la to-do list. Une seule source de vérité pour cette information, conformément au principe de non-duplication de la charte technique.
- **Disposition à 3 colonnes** (`dashboard-row-3`) ajoutée comme modificateur de `.dashboard-row` plutôt que comme système parallèle : la classe de base (`.dashboard-row`, 2 colonnes) reste disponible pour un usage futur, la variante à 3 colonnes s'obtient en cumulant les deux classes.
- **Couleurs décoratives des blocs Agenda** : uniquement des teintes indigo/violet/bleu (famille "accent" de la marque), jamais vert/rouge/orange, pour ne pas empiéter sur les couleurs réservées aux statuts (règle établie depuis l'étape 5 et respectée depuis).
- **Cohérence inter-pages renforcée** : le montant de l'alerte "facture en retard" du tableau de bord (1 250 €) reprend désormais exactement la valeur de la facture FAC-001 affichée sur la page Facturation, plutôt que de laisser deux informations non recoupées sur le même sujet.
- **Test visuel réel bloqué par la politique de navigation de l'extension Chrome** : `file://` refusé (accès aux fichiers locaux non autorisé pour l'extension) et `http://localhost:8834/` également refusé (domaine hors liste blanche de navigation). Un serveur HTTP local minimal (PowerShell, sans dépendance) a été laissé actif sur `http://localhost:8834/` pour permettre une vérification manuelle rapide par le chef de projet ; il ne modifie aucun fichier du projet, il ne fait que le servir.

## Structuration technique et Git — V0.1.2
- **Racine du dépôt Git = `Application-Entrepreneurs-V0/`**, et non le dossier parent `Dossier Développement Claude Code/` : ce choix exclut naturellement, sans règle `.gitignore` dédiée, le dossier de sauvegarde (`backup-v0-before-v0-1-refonte-graphique/`) et le dossier de configuration `.claude/`, tous deux situés en dossiers frères hors du dépôt.
- **Identité Git configurée localement au dépôt** (`git config user.name`/`user.email`, sans `--global`) : Axel Rambour / rambour.axel@gmail.com, à la demande explicite du chef de projet, pour ne pas affecter d'autres dépôts éventuels sur la même machine.
- **Deux commits séparés** plutôt qu'un seul : le premier (`v0.1.1 - refonte graphique stabilisée`) capture exactement l'état applicatif déjà validé, sans aucun ajout ; le second (`v0.1.2 - structuration technique et documentation projet`) regroupe uniquement les nouveaux documents et mises à jour de cette étape. Cela garde un historique Git lisible où chaque commit correspond à une intention claire.
- **Correction du premier commit par `amend`** : la première tentative de commit contenait une faute d'encodage ("stabilisee" au lieu de "stabilisée"). Comme ce commit venait d'être créé à l'instant, sans aucune autre opération entre-temps et sans avoir été partagé, il a été corrigé par `git commit --amend` plutôt que par un nouveau commit correctif — cas où l'amend reste sûr, contrairement à la règle générale de préférer toujours un nouveau commit.
- **Tag `v0.1.1`** créé sur le premier commit uniquement (pas sur le second), pour que le tag corresponde exactement à l'état visuel validé, sans les ajouts documentaires de la V0.1.2.
- **Pas de trailer `Co-Authored-By`** dans les messages de commit de ce projet, à la demande explicite du chef de projet — messages de commit strictement conformes au texte fourni.
- **Dépôt GitHub distant non créé** : `gh` (GitHub CLI) n'est pas installé sur cette machine ; aucune tentative de créer un dépôt distant, d'ajouter un remote ou de pousser n'a été faite. Une procédure manuelle a été documentée à la place (voir rapport de l'étape V0.1.2).
