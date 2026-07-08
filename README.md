# Application Entrepreneurs — V0

> **Note de version — V0.1 à V0.5.3** : l'interface a fait l'objet d'une refonte graphique globale (V0.1), de corrections ciblées sur le tableau de bord (V0.1.1), d'une structuration technique Git/GitHub (V0.1.2), d'une réorganisation de la navigation principale (V0.2 : "Base de données" sortie de la sidebar, ajout de Trésorerie/Produits-Services/Finance), d'une connexion du tableau de bord à ces modules (V0.3), d'une première étape CRM sur la page Clients (V0.4.1 : recherche et filtre par statut fonctionnels, compteur dynamique, accès à une fiche client), de la transformation de cette fiche en une vraie fiche CRM complète (V0.4.2 + ajustements UX V0.4.2.1) : identité, KPI actionnables, informations, notes, historique des échanges, rendez-vous et documents cohérents selon le client sélectionné, de l'ajout d'interactions préparatoires sous forme de modales placeholder (V0.4.3 + ajustements de parcours V0.4.3.1) : changement de statut, personnalisation des statuts, gestion des notes commerciales, retour contextuel Agenda/Facturation — aucune de ces actions ne modifie durablement les données, de la transformation de la page Produits / Services en un vrai catalogue (V0.5.1) : recherche, filtres par type et par statut, compteur dynamique, accès à une fiche produit/service, de la construction de cette fiche en une fiche complète (V0.5.2) : en-tête, résumé commercial, description commerciale, paramètres de vente, utilisation future en facturation, note interne et historique de l'offre, puis de l'ajout d'interactions préparatoires sous forme de 7 modales placeholder (V0.5.3, en cours sur la branche `v0.5.3-products-services-interactions`) : ajout, modification de l'offre, changement de statut, modalités de paiement, détail de marge à venir, note interne, historique complet — toujours sans aucune donnée réellement modifiée. Voir `docs/changelog.md` pour le détail de chaque étape et `docs/versioning.md` pour la méthode de suivi Git recommandée.

## Objectif du projet
Cette application web vise à accompagner les entrepreneurs, indépendants et dirigeants de TPE dans le pilotage quotidien de leur activité, en centralisant les informations essentielles (clients, factures, agenda, trésorerie, indicateurs) au sein d'une interface simple et professionnelle — un véritable cockpit de pilotage.

## Périmètre de la V0
La V0 est **uniquement un prototype visuel cliquable**, avec des données fictives. Elle sert à valider l'interface, l'ergonomie, la navigation générale et le rendu du tableau de bord — ce n'est pas une application fonctionnelle.

## Ce qui a été livré dans la V0

- **Page de connexion fictive** (`pages/login.html`) : nom provisoire "Cockpit Entrepreneur", champs e-mail et mot de passe fictifs (aucune vérification), bouton "Se connecter" fonctionnel qui redirige vers le tableau de bord, lien "Mot de passe oublié ?".
- **Redirection automatique** : `index.html` redirige immédiatement vers la page de connexion.
- **Navigation par sidebar**, présente sur les 10 pages principales : Tableau de bord, Clients, Agenda, Facturation, Trésorerie, Produits / Services, Finance (7 liens de navigation), plus Base de données, Paramètres et Fiche client, accessibles hors sidebar ou depuis un bouton dédié (voir ci-dessous). Le lien actif est toujours visuellement identifiable.
- **Tableau de bord enrichi** avec des données fictives réalistes :
  - 4 KPI principaux (CA du jour, CA du mois, objectif mensuel, trésorerie disponible) avec variations colorées (vert/rouge/neutre) ;
  - une priorité du jour ;
  - un agenda du jour ;
  - une to-do list (avec tâches visuellement cochées, non modifiable) ;
  - des alertes importantes (avec niveaux de gravité rouge/orange/gris) ;
  - un bloc notifications fictif ;
  - 4 indicateurs favoris.
  - **Depuis la V0.3**, le tableau de bord est un véritable hub de navigation : les 4 KPI principaux, les 4 alertes importantes, 3 des 4 indicateurs favoris et 2 tâches de la to-do list sont de vrais liens vers les pages de modules correspondantes (Finance, Trésorerie, Clients, Facturation, Produits / Services, Agenda). Les éléments sans destination existante (ex. "Ajouter une tâche", "Personnaliser les indicateurs") restent en Work in progress.
- **Pages secondaires fictives** :
  - **Clients** : bouton "Ajouter un client", recherche et filtre par statut **réellement fonctionnels** (depuis la V0.4.1), compteur dynamique du nombre de clients affichés, tableau de 6 clients fictifs couvrant 6 statuts (Prospect, Client actif, À relancer, Inactif, Fidèle, Litige), chaque ligne disposant d'un bouton "Voir la fiche" vers `pages/fiche-client.html` ;
  - **Fiche client** *(enrichie en V0.4.2/V0.4.2.1, interactive depuis la V0.4.3)* : fiche CRM complète avec des données cohérentes selon le client sélectionné — en-tête (identité, statut avec icône de modification, coordonnées, adresse, dates), 5 KPI actionnables (CA généré, montant à encaisser, devis en cours, prochaine action, gestes commerciaux), bloc Informations client, bloc-notes commercial (3 dernières notes, icônes modifier/supprimer par note), historique des échanges (5 derniers événements), rendez-vous liés cliquables et documents & facturation (devis/factures/contrats). Un état "Client introuvable" s'affiche proprement si le lien ne correspond à aucun client. Le changement de statut, la personnalisation des statuts et la gestion des notes (ajouter/modifier/supprimer/voir tout) ouvrent de vraies modales, mais aucune action n'est encore enregistrée durablement (pop-up Work in progress) ;
  - **Agenda** : bouton "Ajouter un rendez-vous", liste de rendez-vous fictifs de la journée ;
  - **Facturation** : boutons "Créer une facture"/"Créer un devis", tableau de 5 documents fictifs avec statuts en badges (brouillon, envoyé, payé, en retard) ;
  - **Trésorerie** *(nouveau, V0.2)* : 4 cartes fictives (solde disponible, dépenses/recettes du mois, échéances à venir), module en construction ;
  - **Produits / Services** *(catalogue depuis la V0.5.1, fiche complète depuis la V0.5.2, interactive depuis la V0.5.3)* : recherche et filtres par type et par statut **réellement fonctionnels**, compteur dynamique du nombre d'éléments affichés, tableau de 8 produits/services fictifs (Nom, Type, Prix HT, TVA par défaut, Statut), chaque ligne disposant d'un bouton "Voir la fiche" vers `pages/fiche-produit-service.html`. Le bouton "Ajouter un produit / service" ouvre une vraie modale de formulaire simulé (statut initial Brouillon présélectionné) ;
  - **Fiche produit/service** *(complète depuis la V0.5.2, interactive depuis la V0.5.3)* : en-tête (nom, type, statut cliquable, description, prix HT, TVA), résumé commercial (5 indicateurs dont Coût estimé et Marge estimée en placeholders statiques, avec un lien "Voir le détail" vers une modale de préparation du futur calcul de marge), description commerciale, paramètres de vente (modalités de paiement en badges, modifiables via une modale dédiée), bloc "Utilisation future en facturation" préparant la V0.6, note interne modifiable via modale, et historique de l'offre (3 événements récents affichés, historique complet accessible en modale). Un état "Produit ou service introuvable" s'affiche proprement si le lien ne correspond à aucun élément du catalogue. Le changement de statut, la modification de l'offre, des modalités de paiement et de la note interne ouvrent de vraies modales, mais aucune action n'est encore enregistrée durablement (pop-up Work in progress) ;
  - **Finance** *(nouveau, V0.2)* : 4 cartes fictives (CA, marge, objectif, résultat estimé), zones "bilan prévisionnel"/"compte de résultat"/"objectifs financiers", module en construction ;
  - **Paramètres** : 6 sections fictives, chacune avec un bouton "Modifier" — accessible uniquement via la roue crantée de la topbar, pas depuis la sidebar (accès transversal).
  - **Base de données** : 6 cartes représentant les bases centrales de l'application ; depuis la V0.2, cette page n'est plus reliée depuis la navigation (elle reste dans les fichiers en attendant une décision de suppression ou de refonte, voir `docs/backlog.md`).
- **Pop-up centralisé "Work in progress"** : tous les boutons non fonctionnels (11 au total) affichent ce message au clic. Il se ferme via le bouton "Fermer", un clic en dehors de la fenêtre, ou la touche Échap.
- **Harmonisation visuelle générale** : boutons, cartes, tableaux, badges, espacements et couleurs cohérents sur l'ensemble du prototype.
- **Tests de navigation** réalisés sur le parcours complet (voir `docs/changelog.md`, étape 9) : aucun problème bloquant identifié.

Toutes les données affichées (clients, montants, rendez-vous, alertes, etc.) sont **fictives** et servent uniquement à tester le rendu visuel. Aucune d'entre elles n'est enregistrée ou modifiable.

## Comment ouvrir et tester le prototype

1. Ouvrir le fichier `index.html` dans un navigateur web.
2. Vérifier que vous êtes redirigé automatiquement vers la page de connexion.
3. Cliquer sur "Se connecter" (les champs peuvent rester vides).
4. Vous arrivez sur le tableau de bord.
5. Utiliser la sidebar pour naviguer entre Tableau de bord, Clients, Agenda, Facturation, Trésorerie, Produits / Services et Finance. Paramètres reste accessible via la roue crantée de la topbar.
6. Cliquer sur n'importe quel bouton fictif (ex. "Ajouter un client", "Créer une facture", "Modifier") pour voir apparaître le pop-up "Work in progress".
7. Fermer ce pop-up avec le bouton "Fermer", en cliquant en dehors de la fenêtre, ou avec la touche Échap.

Aucune installation n'est nécessaire : le prototype fonctionne directement dans un navigateur, sans serveur ni connexion internet.

## Limites de la V0

La V0 ne contient pas :
- de vraie authentification, création de compte ou récupération de mot de passe ;
- de vraie base de données ni de vraie sauvegarde ;
- de création, modification ou suppression réelle de client, rendez-vous, devis ou facture ;
- de modification réelle des paramètres ;
- de recherche ni de filtres fonctionnels ;
- d'exports ;
- de calculs dynamiques ;
- de notifications réelles ;
- de personnalisation réelle des indicateurs ;
- de version mobile complète (le responsive n'était pas prioritaire pour cette version) ;
- d'intelligence artificielle intégrée au produit.

## Suggestions d'amélioration (non appliquées)

Ces pistes sont identifiées pour information uniquement. Elles n'ont pas été développées et nécessitent une validation avant toute mise en œuvre :
- ajustements de design après retours utilisateurs ;
- amélioration ou enrichissement du tableau de bord ;
- refonte ou ajustement de certaines pages secondaires ;
- activation future des recherches et filtres ;
- création de fiches clients détaillées ;
- création réelle de rendez-vous, devis et factures ;
- ajout d'une vraie base de données et d'une sauvegarde ;
- gestion des utilisateurs ;
- amélioration responsive/mobile ;
- réflexion sur la sécurité et les droits d'accès ;
- préparation du cahier des charges V1 ;
- architecture à composants ou templates pour réduire la duplication HTML actuelle (barre d'onglets notamment), si le projet évolue vers un outillage plus avancé qu'une V0 statique.

## Points à prévoir pour la V1 (base de réflexion, non définitif)

- vraie gestion des clients, de l'agenda et de la facturation ;
- centralisation réelle des données (bases de données) ;
- sauvegarde des informations ;
- recherche et filtres fonctionnels ;
- paramétrage réel des objectifs ;
- personnalisation réelle des indicateurs du tableau de bord ;
- amélioration responsive ;
- réflexion sur la sécurité et les accès utilisateurs ;
- réflexion sur la structure technique future (architecture modulaire réelle, comme décrite dans la charte technique).

## Pour aller plus loin

- `PROJECT_INDEX.md` — organisation complète du projet.
- `docs/changelog.md` — détail de chaque étape de développement, de la V0 initiale à la V0.1.2.
- `docs/decisions.md` — décisions techniques et de conception prises pendant le développement.
- `docs/roadmap-v0bis.md` — phases prévues après la V0 (V0.1 à V1).
- `docs/backlog.md` — idées et pistes non traitées immédiatement, classées par thème.
- `docs/versioning.md` — règles de suivi des versions avec Git (commits, tags, branches).
- Les README de chaque dossier (`css/`, `js/`, `pages/`, `components/`, `assets/`, `docs/`) — rôle précis de chaque emplacement.

## Suivi du projet

Le projet est désormais versionné avec Git (dépôt local à la racine de `Application-Entrepreneurs-V0/`). Voir `docs/versioning.md` pour la convention de nommage des versions et `docs/roadmap-v0bis.md` pour les prochaines phases.
