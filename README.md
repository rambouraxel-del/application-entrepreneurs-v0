# Application Entrepreneurs — V0

> **Note de version — V0.1 à V0.2** : l'interface a fait l'objet d'une refonte graphique globale (V0.1), de corrections ciblées sur le tableau de bord (V0.1.1), d'une structuration technique Git/GitHub (V0.1.2), puis d'une réorganisation de la navigation principale (V0.2, en cours sur la branche `v0.2-navigation-architecture`) : "Base de données" est sortie de la sidebar et trois nouvelles portes d'entrée (Trésorerie, Produits / Services, Finance) ont été ajoutées comme placeholders. Voir `docs/changelog.md` pour le détail de chaque étape et `docs/versioning.md` pour la méthode de suivi Git recommandée.

## Objectif du projet
Cette application web vise à accompagner les entrepreneurs, indépendants et dirigeants de TPE dans le pilotage quotidien de leur activité, en centralisant les informations essentielles (clients, factures, agenda, trésorerie, indicateurs) au sein d'une interface simple et professionnelle — un véritable cockpit de pilotage.

## Périmètre de la V0
La V0 est **uniquement un prototype visuel cliquable**, avec des données fictives. Elle sert à valider l'interface, l'ergonomie, la navigation générale et le rendu du tableau de bord — ce n'est pas une application fonctionnelle.

## Ce qui a été livré dans la V0

- **Page de connexion fictive** (`pages/login.html`) : nom provisoire "Cockpit Entrepreneur", champs e-mail et mot de passe fictifs (aucune vérification), bouton "Se connecter" fonctionnel qui redirige vers le tableau de bord, lien "Mot de passe oublié ?".
- **Redirection automatique** : `index.html` redirige immédiatement vers la page de connexion.
- **Navigation par sidebar**, présente sur les 9 pages principales : Tableau de bord, Clients, Agenda, Facturation, Trésorerie, Produits / Services, Finance (7 liens de navigation), plus Base de données et Paramètres, accessibles hors sidebar (voir ci-dessous). Le lien actif est toujours visuellement identifiable.
- **Tableau de bord enrichi** avec des données fictives réalistes :
  - 4 KPI principaux (CA du jour, CA du mois, objectif mensuel, trésorerie disponible) avec variations colorées (vert/rouge/neutre) ;
  - une priorité du jour ;
  - un agenda du jour ;
  - une to-do list (avec tâches visuellement cochées, non modifiable) ;
  - des alertes importantes (avec niveaux de gravité rouge/orange/gris) ;
  - un bloc notifications fictif ;
  - 4 indicateurs favoris.
- **Pages secondaires fictives** :
  - **Clients** : bouton "Ajouter un client", barre de recherche fictive, tableau de 4 clients fictifs avec statuts ;
  - **Agenda** : bouton "Ajouter un rendez-vous", liste de rendez-vous fictifs de la journée ;
  - **Facturation** : boutons "Créer une facture"/"Créer un devis", tableau de 5 documents fictifs avec statuts en badges (brouillon, envoyé, payé, en retard) ;
  - **Trésorerie** *(nouveau, V0.2)* : 4 cartes fictives (solde disponible, dépenses/recettes du mois, échéances à venir), module en construction ;
  - **Produits / Services** *(nouveau, V0.2)* : bouton "Ajouter un produit", tableau fictif de produits/services, module en construction ;
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
