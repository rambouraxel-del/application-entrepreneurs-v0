# Application Entrepreneurs — V0

> **Note de version — V0.1 à V0.9.2 (dernière version sur `main`)** : l'interface a fait l'objet d'une refonte graphique globale (V0.1), de corrections ciblées sur le tableau de bord (V0.1.1), d'une structuration technique Git/GitHub (V0.1.2), d'une réorganisation de la navigation principale (V0.2), d'une connexion du tableau de bord à ces modules (V0.3), d'un module Clients/CRM complet avec fiche détaillée et interactions préparatoires (V0.4.1 à V0.4.3.1), d'un module Produits/Services complet avec catalogue, fiche détaillée et interactions préparatoires (V0.5.1 à V0.5.3.1), de l'ajout d'une pagination simple et réutilisable sur les listes Clients et Produits/Services (V0.5.4), du module Facturation : une page Paramètres entreprise et un module Devis complet (V0.6.1, validée, taguée `v0.6.1`), un module Factures & Paiements (V0.6.2, validée, taguée `v0.6.2`), des documents imprimables/PDF pour les devis et les factures via l'impression navigateur (V0.6.3, validée, taguée `v0.6.3`), l'intégration commerciale de ce module dans le reste de l'application — fiche client, tableau de bord, statistiques commerciales, navigation croisée (V0.6.4, validée, taguée `v0.6.4`), un module Agenda commercial complet — rendez-vous, préparation commerciale, communication client, devis brouillon lié, historique, export PDF (V0.7, validée, taguée `v0.7`), des vues calendrier Jour/Semaine/Mois et un formulaire de rendez-vous enrichi (proposition commerciale, recherche client, navigation temporelle fiable) (V0.7.1, validée, taguée `v0.7.1`), un module Trésorerie complet — solde estimé, à encaisser/à décaisser, prochains mouvements, charges prévues, factures à encaisser, projection et alertes de trésorerie (V0.8, validée, taguée `v0.8`), et enfin le renommage du module Finance en **Analyses** — un cockpit d'analyse transversal (Vue d'ensemble, Commercial, Clients, Activité, Trésorerie) qui recoupe les données déjà existantes sans les dupliquer, avec une refonte visuelle en V0.9.1 (V0.9 et V0.9.1, validées, taguées `v0.9` et `v0.9.1`), et enfin une configuration de démonstration centralisée dans `js/demo-config.js` pour adapter rapidement l'identité fictive affichée à un prospect (V0.9.2, validée, taguée `v0.9.2`). Le tout démontré sur des données fictives, sans aucune persistance réelle (quelques actions comme l'émission d'une facture, l'ajout d'un paiement ou la création d'un rendez-vous sont réelles en mémoire de page, mais rien ne survit à un rechargement). Voir `docs/changelog.md` pour le détail de chaque étape et `docs/versioning.md` pour la méthode de suivi Git recommandée.

## Objectif du projet
Cette application web vise à accompagner les entrepreneurs, indépendants et dirigeants de TPE dans le pilotage quotidien de leur activité, en centralisant les informations essentielles (clients, factures, agenda, trésorerie, indicateurs) au sein d'une interface simple et professionnelle — un véritable cockpit de pilotage.

## Périmètre de la V0
La V0 est **uniquement un prototype visuel cliquable**, avec des données fictives. Elle sert à valider l'interface, l'ergonomie, la navigation générale et le rendu du tableau de bord — ce n'est pas une application fonctionnelle.

## Ce qui a été livré dans la V0

- **Page de connexion fictive** (`pages/login.html`) : nom provisoire "Cockpit Entrepreneur", champs e-mail et mot de passe fictifs (aucune vérification), bouton "Se connecter" fonctionnel qui redirige vers le tableau de bord, lien "Mot de passe oublié ?".
- **Redirection automatique** : `index.html` redirige immédiatement vers la page de connexion.
- **Navigation par sidebar**, présente sur les 10 pages principales : Tableau de bord, Clients, Agenda, Facturation, Trésorerie, Produits / Services, Analyses (7 liens de navigation), plus Base de données, Paramètres et Fiche client, accessibles hors sidebar ou depuis un bouton dédié (voir ci-dessous). Le lien actif est toujours visuellement identifiable.
- **Tableau de bord enrichi** avec des données fictives réalistes :
  - 4 KPI principaux (CA du jour, CA du mois, objectif mensuel, trésorerie disponible) avec variations colorées (vert/rouge/neutre) ;
  - une priorité du jour ;
  - un agenda du jour ;
  - une to-do list (avec tâches visuellement cochées, non modifiable) ;
  - des alertes importantes (avec niveaux de gravité rouge/orange/gris) ;
  - un bloc notifications fictif ;
  - 4 indicateurs favoris.
  - **Depuis la V0.3**, le tableau de bord est un véritable hub de navigation : les 4 KPI principaux, les 4 alertes importantes, 3 des 4 indicateurs favoris et 2 tâches de la to-do list sont de vrais liens vers les pages de modules correspondantes (Analyses, Trésorerie, Clients, Facturation, Produits / Services, Agenda). Les éléments sans destination existante (ex. "Ajouter une tâche", "Personnaliser les indicateurs") restent en Work in progress.
  - **Depuis la V0.6.4**, un bloc compact "Aperçu Facturation" (facturé, encaissé, reste à encaisser, factures en retard, devis en attente, taux de transformation) complète le tableau de bord, calculé depuis les vraies données Devis/Factures ; la carte favorite "Devis envoyés" reflète désormais le vrai nombre de devis Envoyés plutôt qu'une valeur statique.
  - **Depuis la V0.7**, le bloc "Agenda du jour" devient "Agenda commercial" : liste réelle des rendez-vous du jour, puis compteurs (prochains rendez-vous, non confirmés, reportés, devis brouillon en attente, reportés plusieurs fois), calculés depuis les vraies données de rendez-vous.
  - **Depuis la V0.8**, un bloc compact "Aperçu Trésorerie" (solde estimé, à encaisser, à décaisser, solde prévisionnel à 30 jours, alerte principale) complète le tableau de bord ; la carte KPI "Trésorerie disponible" reflète désormais le vrai solde estimé plutôt qu'une valeur statique.
  - **Depuis la V0.9**, un bloc compact "Aperçu Analyses" (taux de transformation devis → facture, top client, alerte principale) complète le tableau de bord, calculé depuis `COCKPIT_ANALYSES_CALC`.
- **Pages secondaires fictives** :
  - **Clients** : bouton "Ajouter un client", recherche et filtre par statut **réellement fonctionnels** (depuis la V0.4.1), tableau de 6 clients fictifs couvrant 6 statuts (Prospect, Client actif, À relancer, Inactif, Fidèle, Litige), chaque ligne disposant d'un bouton "Voir la fiche" vers `pages/fiche-client.html`. **Pagination réelle depuis la V0.5.4** : sélecteur "Afficher 5/10/25", navigation Précédent/Suivant, indicateur "Page X sur Y" et compteur enrichi ("1–5 sur 6 clients"), le tout compatible avec la recherche et le filtre par statut ;
  - **Fiche client** *(enrichie en V0.4.2/V0.4.2.1, interactive depuis la V0.4.3, section Documents & facturation réelle depuis la V0.6.4, rendez-vous liés réels depuis la V0.7)* : fiche CRM complète avec des données cohérentes selon le client sélectionné — en-tête (identité, statut avec icône de modification, coordonnées, adresse, dates), 5 KPI actionnables (CA généré, montant à encaisser, devis en cours, prochaine action, gestes commerciaux), bloc Informations client, bloc-notes commercial (3 dernières notes, icônes modifier/supprimer par note), historique des échanges (5 derniers événements), **rendez-vous réellement liés au client** (calculés depuis les données de rendez-vous, cliquables vers la fiche rendez-vous) et **documents & facturation réellement liés au client** (devis et factures calculés depuis `DEVIS_DETAILS`/`FACTURE_DETAILS` via `clientSlug`, avec statut, montant TTC, reste à payer et liens vers l'éditeur et le document imprimable ; les anciennes entrées fictives Devis/Facture ont été retirées, les entrées Contrat restent inchangées). Un état "Client introuvable" s'affiche proprement si le lien ne correspond à aucun client. Le changement de statut, la personnalisation des statuts et la gestion des notes (ajouter/modifier/supprimer/voir tout) ouvrent de vraies modales, mais aucune action n'est encore enregistrée durablement (pop-up Work in progress) ;
  - **Agenda** *(nouveau, V0.7)* : liste réelle des rendez-vous commerciaux avec recherche, filtres (Tous, Aujourd'hui, Cette semaine, À confirmer, Reportés, Réalisés, Sans suite) et pagination. Le bouton "Ajouter un rendez-vous" est réel et ouvre la fiche rendez-vous en création ;
  - **Fiche rendez-vous** *(nouveau, V0.7, `pages/fiche-rdv.html`)* : création et consultation/modification d'un rendez-vous commercial — identité (titre, date, horaire, client, lieu, statut, priorité, opportunité, montant potentiel, notes internes), bloc **Préparation commerciale** (contexte du besoin, notes diverses, proposition envisagée, prix cible, prix minimum, marge de négociation calculée, arguments commerciaux, objections possibles, prochaines étapes), bloc **Communication client** (confirmation, rappels effectués, relances, dernière/prochaine communication, commentaire de suivi) avec des actions rapides réelles (marquer confirmé/relancé/réalisé, reporter, sans suite), bloc **Devis lié** — un rendez-vous génère automatiquement un devis brouillon lié dès qu'un client est renseigné ; ce brouillon peut être supprimé (tant qu'il n'a jamais été envoyé ni converti en facture) ou transformé en devis classique, qui suit ensuite le parcours normal jusqu'à la facture — et un **historique** des changements importants (statut, report, devis, communication, préparation), avec un signalement visuel si le rendez-vous a été reporté plusieurs fois. Un bouton **"Exporter la fiche de préparation en PDF"** (`pages/rdv-document.html`) génère un document imprimable une à deux pages, avec deux zones vierges "Notes pendant le rendez-vous" et "Suite à donner". Toutes ces actions sont réelles en mémoire de page : rien ne survit à un rechargement ;
  - **Facturation** *(liste de devis réelle depuis la V0.6.1, liste de factures réelle depuis la V0.6.2, statistiques commerciales depuis la V0.6.4)* : un bloc "Statistiques commerciales" (CA facturé/encaissé/reste à encaisser, taux de transformation, panier moyen facture, montant moyen devis, top clients, prochaines échéances — texte uniquement, aucun graphique) surmonte les onglets "Devis" / "Factures", tous deux réels et indépendants (recherche, filtre par statut et pagination propres à chacun). 6 devis fictifs couvrant 4 statuts (Brouillon, Envoyé, Accepté, Refusé) et 6 factures fictives couvrant les statuts affichés (Émise, Partiellement payée, Payée, En retard, Annulée, Brouillon). Boutons "Créer un devis" et "Créer une facture" tous deux réels ;
  - **Fiche devis** *(`pages/devis-edition.html`, V0.6.1, enrichie par les correctifs de revue V0.6.1)* : consultation, création, modification et duplication sur une seule page, sans assistant en plusieurs étapes. Client sélectionné via une recherche avancée ("contient", sur nom/société/téléphone/e-mail/adresse) dans la base Clients (référence vivante + informations figées par version), prestations ajoutées depuis le catalogue Produits/Services (recherche avancée, uniquement les éléments au statut Actif) puis totalement indépendantes du catalogue une fois copiées dans une ligne, description de ligne agrandissable en modale. Lignes éditables avec calcul automatique HT/TVA/TTC/remise en temps réel (récapitulatif détaillé : Total HT avant remise, Remises, Total HT net, TVA, Total TTC), conditions de paiement, numérotation `DEV-AAAA-00001` indicative, versionnement et verrouillage automatique des devis Acceptés. "Créer une nouvelle version" est réel (brouillon en mémoire de page basé sur la dernière version) ; un devis Accepté peut être **converti en facture** (bouton réel, vers `facture-edition.html`). "Enregistrer" (menu brouillon/version définitive) et "Supprimer" restent en Work in progress. Depuis la V0.7, un devis créé automatiquement depuis un rendez-vous affiche un lien "Voir le rendez-vous lié" ;
  - **Fiche facture** *(V0.6.2, `pages/facture-edition.html`)* : même principe "document vivant" qu'une fiche devis (client, lignes, calculs, conditions de paiement), avec un cycle de vie propre aux factures. Un brouillon reste pleinement éditable et n'a pas encore de numéro ; **"Émettre la facture"** est une action réelle qui attribue le numéro officiel `FAC-AAAA-00001`, une date d'émission et une échéance, puis verrouille durablement la facture (lignes, client, snapshots et conditions de paiement ne sont plus modifiables). Un bloc **Paiements** permet d'**ajouter un paiement réel** (date, montant, mode, référence, note) sur une facture Émise : total payé, reste à payer, pourcentage payé et statut affiché (Non payée/Partiellement payée/Payée/En retard) se recalculent immédiatement, un paiement dépassant le reste à payer étant refusé. L'annulation d'une facture Émise n'est volontairement pas proposée (renvoyée à un futur module Avoirs). Toutes ces actions réelles restent en mémoire de page : rien ne survit à un rechargement ;
  - **Documents devis et facture** *(nouveau, V0.6.3, `pages/devis-document.html` et `pages/facture-document.html`)* : depuis une fiche devis ou facture déjà enregistrée (bouton "Aperçu / Imprimer", masqué sur un document en cours de création non enregistré), pages sans sidebar ni topbar, rendu sobre proche d'un logiciel de comptabilité — émetteur, client, lignes, récapitulatif, conditions de paiement, mentions légales, zone de signature pour les devis, paiements et reste à payer pour les factures émises. Bannières dédiées (brouillon, version historique de devis, facture annulée). Bouton **"Imprimer / Enregistrer en PDF"** : appelle simplement l'impression du navigateur (`window.print()` avec un CSS d'impression dédié, `css/print.css`) — aucune bibliothèque PDF externe ;
  - **Trésorerie** *(placeholder depuis la V0.2, module réel depuis la V0.8, `pages/tresorerie.html`)* : outil simple de pilotage du cash, pas une comptabilité complète. 4 cartes KPI (solde estimé, à encaisser, à décaisser, solde prévisionnel), calculées depuis les factures/paiements réels et des opérations de trésorerie manuelles (charges prévues, encaissements/décaissements divers). Bloc **Prochains mouvements** (timeline chronologique, factures à encaisser et opérations confondues, lien direct vers la facture concernée), tableau **Charges prévues** (catégorie, libellé, échéance, montant, statut) et tableau **Factures à encaisser** (reprises des factures émises non soldées, cohérentes avec les paiements déjà enregistrés dans la Facturation), un graphique SVG simple de projection du solde sur la période sélectionnée (30/60/90 jours), et un bloc **Alertes & points d'attention** (factures en retard, charge importante sous 7 jours, risque de tension de trésorerie, encaissement important attendu), calculé automatiquement. Le bouton **"Ajouter une opération"** est réel (type, libellé, catégorie, montant, date, statut, notes, récurrence) et recalcule immédiatement les totaux — comme ailleurs dans l'application, rien ne survit à un rechargement ;
  - **Produits / Services** *(catalogue depuis la V0.5.1, fiche complète depuis la V0.5.2, interactive depuis la V0.5.3, pagination depuis la V0.5.4)* : recherche et filtres par type et par statut **réellement fonctionnels**, tableau de 8 produits/services fictifs (Nom, Type, Prix HT, TVA par défaut, Statut), chaque ligne disposant d'un bouton "Voir la fiche" vers `pages/fiche-produit-service.html`. Le bouton "Ajouter un produit / service" ouvre une vraie modale de formulaire simulé (statut initial Brouillon présélectionné). Pagination réelle (sélecteur "Afficher 5/10/25", Précédent/Suivant, compteur enrichi "1–5 sur 8 éléments"), compatible avec la recherche et les filtres type/statut ;
  - **Fiche produit/service** *(complète depuis la V0.5.2, interactive depuis la V0.5.3, corrigée en V0.5.3.1)* : en-tête (nom modifiable via icône crayon, badges Type et Statut tous deux cliquables, description, prix HT, TVA), résumé commercial (5 indicateurs dont Coût estimé — calculé localement à partir du bloc Coûts & marge — et Marge estimée, avec un lien "Voir le détail" vers une modale reprenant le détail des coûts), description commerciale modifiable via icône crayon, paramètres de vente modifiables dans leur ensemble via une seule modale (prix, TVA, conditions, modalités de paiement en badges), bloc **Coûts & marge** (tableau de composantes de coût, total calculé à l'affichage, bouton "Ajouter un coût"), note interne modifiable via modale, et historique de l'offre enrichi (date, heure, administrateur ; 3 événements récents affichés, historique complet accessible en modale). Un état "Produit ou service introuvable" s'affiche proprement si le lien ne correspond à aucun élément du catalogue. Toutes ces actions ouvrent de vraies modales, mais aucune n'est encore enregistrée durablement (pop-up Work in progress) ;
  - **Analyses** *(anciennement "Finance" depuis la V0.2, module réel depuis la V0.9, `pages/analyses.html`)* : cockpit d'analyse transversal, pas une comptabilité complète — recoupe les données déjà existantes (Facturation, Clients, Agenda, Trésorerie) sans dupliquer leurs calculs. Cinq onglets : **Vue d'ensemble** (CA facturé/encaissé, reste à encaisser, taux de transformation, clients actifs, RDV réalisés, solde de trésorerie estimé, bloc "Lecture rapide" à constats automatiques, alertes principales), **Commercial** (devis créés/acceptés/refusés/en attente, taux de transformation, montants moyens devis/facture, répartition des devis par statut, top devis), **Clients** (clients actifs/inactifs/en retard, top clients par CA facturé avec mini-graphique en barres, tableau détaillé CA/encaissé/reste/devis/RDV), **Activité** (indicateurs RDV, tunnel Rendez-vous → Devis → Facture, points d'attention), **Trésorerie** (synthèse reprenant la V0.8, lien direct vers le module). Sélecteur de période (Toutes périodes par défaut, Mois/Trimestre/Année en cours) ;
  - **Paramètres** : 6 sections fictives — accessible uniquement via la roue crantée de la topbar, pas depuis la sidebar (accès transversal). Depuis la V0.6.1, "Informations de l'entreprise" mène à une vraie page (`pages/parametres-entreprise.html` : nom, logo placeholder, coordonnées, SIREN/SIRET/TVA, IBAN/BIC, mentions légales par défaut) qui sert de source à l'émetteur des devis ; les 5 autres sections restent de simples boutons "Modifier" en Work in progress.
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
5. Utiliser la sidebar pour naviguer entre Tableau de bord, Clients, Agenda, Facturation, Trésorerie, Produits / Services et Analyses. Paramètres reste accessible via la roue crantée de la topbar.
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
