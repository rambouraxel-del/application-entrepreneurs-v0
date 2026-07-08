# Backlog produit

Ce document regroupe les idées et pistes identifiées au fil du projet, non traitées immédiatement. Il reste volontairement synthétique : l'objectif est de ne perdre aucune idée importante, pas de détailler chaque point comme un cahier des charges.

## Tableau de bord
- Amélioration plus poussée du widget Agenda (identifiée lors de la validation V0.1.1).
- Vrai système de personnalisation des KPI (bouton "Personnaliser les indicateurs" ajouté en Work in progress en V0.3).
- Vrai graphique d'évolution du CA, basé sur des données réelles.
- Priorité du jour réellement modifiable par l'utilisateur.
- Vraie logique de tâches (création, modification, suppression) — "Ajouter une tâche" reste en Work in progress depuis la V0.1.1/V0.3.
- Panneau "Voir toutes les alertes" agrégeant l'ensemble des alertes, si un tel besoin se confirme (pas de page cible aujourd'hui).
- Si un module Fournisseurs voit le jour, revoir "Appeler le fournisseur Dupont" (non cliquable en V0.3, faute de destination).

## Navigation
- Harmonisation du sélecteur de date sur toutes les pages (actuellement présent uniquement sur le tableau de bord, décision assumée en V0.1.1).
- Réflexion sur une architecture à composants/templates pour éliminer la duplication de la sidebar et de la topbar entre les fichiers HTML.

## Clients / CRM
- Création, modification et suppression réelles de clients (bouton "Ajouter un client" et "Modifier" toujours en Work in progress).
- **Vrai changement de statut persistant** : la modale "Modifier le statut client" (V0.4.3) ouvre un vrai sélecteur, mais "Enregistrer" ne modifie rien durablement (ferme la modale + Work in progress).
- **Vraie personnalisation des statuts** (ajout/modification/suppression) : la modale "Personnaliser les statuts clients" (V0.4.3) est un placeholder visuel complet (liste, icônes, bouton "Ajouter un statut") sans aucune logique réelle. La liste actuelle (Prospect, Client actif, À relancer, Inactif, Fidèle, Litige) reste centralisée dans `js/app.js` (`CLIENT_STATUSES`, exposée via `window.COCKPIT_CLIENT_STATUSES`).
- Tri des colonnes de la liste clients (non traité ; pagination ajoutée en V0.5.4 via `window.COCKPIT_LIST_PAGINATION`).
- **Sauvegarde du nombre d'éléments par page choisi (V0.5.4)** : le sélecteur "Afficher X" repart toujours à 5 au rechargement de la page, aucune préférence n'est mémorisée (pas de `localStorage`, hors périmètre V0).
- **`CLIENT_DETAILS` (V0.4.2, étendu en V0.4.3 avec `notesArchive`) reste une source statique en mémoire** : à remplacer par une vraie source de données (backend) le jour où le projet en aura une. Actuellement limitée aux 6 clients déjà présents dans `clients.html`.
- Personnalisation réelle des champs du bloc Informations client (icône "Personnaliser les champs" en Work in progress depuis la V0.4.2).
- **Vraie création/édition/suppression de notes commerciales** : les modales "Ajouter une note"/"Modifier la note"/"Supprimer cette note ?" (V0.4.3) s'ouvrent réellement (textarea pré-rempli pour l'édition, extrait pour la suppression) mais aucune validation n'est persistée. La modale "Toutes les notes commerciales" reste en lecture seule (pas d'icônes modifier/supprimer sur les notes archivées).
- Page ou panneau complet "Voir tout l'historique" des échanges (reste en Work in progress ; historique limité à 5 événements par client sur la fiche).
- Vraie liaison dynamique fiche client ↔ Agenda et fiche client ↔ Facturation : les liens "Voir dans l'agenda"/"Voir dans Facturation" (V0.4.2) pointent vers les pages génériques, sans filtrage par client.
- Téléchargement PDF réel des documents liés à un client (bouton "Télécharger PDF" en Work in progress).
- Vrai menu d'actions pour le bouton "…" de la fiche client (aucun composant de menu contextuel dans le projet à ce jour).
- Vrai ciblage d'un rendez-vous précis dans l'agenda (le lien `agenda.html?rdv=<id>` ajouté en V0.4.2.1 n'est pas encore lu par `agenda.html`).
- Le moteur de modale générique (`COCKPIT_MODAL`, V0.4.3) est réutilisable par d'autres pages si un besoin de modale apparaît ailleurs dans l'application.
- Le helper de pagination générique (`COCKPIT_LIST_PAGINATION`, V0.5.4) est réutilisable tel quel pour toute future liste tabulaire (Devis/Factures en V0.6, Trésorerie en V0.7...) : il suffit de lui fournir les lignes, les champs de recherche/filtre/pagination et une fonction `matchRow` propre à la page.

## Agenda
- Vraie gestion des rendez-vous (création, modification, suppression).
- Vues jour/semaine/mois interactives.

## Facturation
- Page placeholder ajoutée à la navigation en V0.2 ; devenue la vraie liste des devis en V0.6.1 (recherche, filtre statut, pagination), avec un éditeur de devis complet (`pages/devis-edition.html`).
- **Vraie création, modification, suppression de devis** : le générateur (client, lignes, calculs HT/TVA/TTC/remise) est entièrement fonctionnel en direct, mais "Enregistrer"/"Supprimer"/"Créer une nouvelle version" ne persistent rien (Work in progress).
- **`DEVIS_DETAILS` (V0.6.1) reste une source statique en mémoire**, limitée à 5 devis fictifs : à remplacer par une vraie source de données le jour où le projet en aura une.
- **Vraie numérotation persistante** : `computeNextDevisNumero` calcule un numéro plausible par balayage des données fictives existantes, sans allocation réelle ni compteur qui survivrait à un rechargement.
- **Vrai versionnement persistant** : le concept (plusieurs versions d'un même devis, une seule active, historique consultable) est démontré sur `DEV-2026-00015`, mais aucune nouvelle version ne peut réellement être créée et conservée.
- Factures réelles, conversion devis → facture, paiements, échéances, avoirs : prévus dans une prochaine sous-version (V0.6.2), pour laquelle l'onglet "Factures" (actuellement `btn-wip` sur `facturation.html`) est déjà préparé.
- Export des documents (PDF notamment), impression.
- Suivi réel des statuts de paiement.
- Vraie sélection de client via une modale de recherche (plutôt qu'un simple `<select>`) si le volume de clients augmente significativement.
- Remise en montant fixe par ligne, en complément de la remise en pourcentage actuelle.
- Statistiques et tableau de bord liés à la facturation.

## Trésorerie
- Page placeholder ajoutée à la navigation en V0.2 ; développement fonctionnel réel prévu en V0.7 sur la roadmap.
- Synchronisation bancaire (hors périmètre tant qu'une vraie base de données n'existe pas).

## Produits / Services
- Page placeholder ajoutée à la navigation en V0.2 ; catalogue consultable (recherche, filtres, accès fiche) construit en V0.5.1 ; fiche produit/service complète construite en V0.5.2 ; interactions préparatoires (modales) ajoutées en V0.5.3, corrigées et enrichies en V0.5.3.1 (bloc Coûts & marge, historique enrichi, badge Type cliquable, modifications bloc par bloc) ; pagination ajoutée en V0.5.4.
- **Vraie création, modification et suppression de produits/services** : les modales "Ajouter un produit / service" (catalogue), "Changer le type"/"Changer le statut"/"Modifier le nom"/"Modifier la description commerciale"/"Modifier les paramètres de vente"/"Modifier la note interne"/"Ajouter un coût" (fiche) s'ouvrent et se pré-remplissent réellement, mais aucune validation n'est persistée (`PRODUCT_DETAILS` reste inchangé).
- **`PRODUCT_DETAILS` (V0.5.1, enrichi en V0.5.2/V0.5.3/V0.5.3.1) reste une source statique en mémoire**, limitée aux 8 éléments fictifs du catalogue : à remplacer par une vraie source de données le jour où le projet en aura une.
- Catégories / familles de produits/services : volontairement absentes du tableau en V0.5.1 pour ne pas alourdir le catalogue ; à réévaluer plus tard si le volume le justifie.
- Unités personnalisables, gestion des stocks.
- **Vrai moteur de calcul de marge** : le bloc "Coûts & marge" (V0.5.3.1) calcule un total de coût local à l'affichage (somme de lignes `quantite × coutUnitaire`), et la modale "Détail de marge à venir" affiche les futures familles de coûts (production, mise en service, commercial, sous-traitance, frais variables, marge cible) toutes à "À définir". Marge estimée reste un champ texte statique, indépendant du coût calculé — aucune formule ne relie encore les deux.
- **Vraie sauvegarde des lignes de coût** : "Ajouter un coût" (V0.5.3.1) ouvre une modale réelle mais n'ajoute jamais de ligne au tableau `couts` affiché ; pas de modification/suppression de ligne existante non plus.
- Vrai calcul de TVA (dépendant du type de société, du régime fiscal, des Paramètres), affichage d'un prix TTC : la TVA reste indicative.
- Historique de ventes, statistiques de performance par produit/service.
- **Historique de l'offre toujours statique** : la modale "Historique complet de l'offre" affiche l'intégralité des événements écrits en dur par élément (`OFFER_HISTORY_TYPES`, incluant "Modification des modalités de paiement" depuis la V0.5.3), désormais avec heure et auteur fictif ("Administrateur principal", V0.5.3.1) ; aucun mécanisme n'enregistre automatiquement un changement réel, ni ne distingue plusieurs administrateurs.
- **Bloc "Utilisation future en facturation" supprimé en V0.5.3.1** (jugé trop déclaratif) : la préparation de la Facturation V0.6 repose désormais uniquement sur la structure des données (`PRODUCT_DETAILS`) et non plus sur un bloc dédié de la fiche ; à revoir lors de la construction réelle de la V0.6.
- **`STATUS_AVAILABILITY.selectionnable`** (posé en V0.5.2, plus affiché comme bloc dédié depuis la V0.5.3.1 mais toujours utilisé pour la carte KPI "Statut d'utilisation") **sert désormais aussi de filtre réel** dans la modale "Ajouter depuis le catalogue" du module Devis (V0.6.1) : seuls les produits/services au statut Actif y sont proposés. À réévaluer si un jour la "disponibilité en devis/facture" doit pouvoir diverger du statut brut (ex. un produit Actif volontairement exclu des devis).
- **Vraie personnalisation des statuts, des types et des modalités de paiement** (ajout/modification/suppression des valeurs elles-mêmes) : contrairement à la fiche client (V0.4.3), aucune modale de personnalisation n'est proposée pour les produits/services — seule la sélection parmi les valeurs existantes est proposée.
- Tri des colonnes du catalogue (non traité ; pagination ajoutée en V0.5.4 via `window.COCKPIT_LIST_PAGINATION`, partagé avec la liste Clients).
- **Sauvegarde du nombre d'éléments par page choisi (V0.5.4)** : repart toujours à 5 au rechargement, aucune préférence n'est mémorisée (pas de `localStorage`).

## Finance
- Page placeholder ajoutée à la navigation en V0.2 ; développement fonctionnel réel (bilan, compte de résultat, calculs) prévu en V0.9 sur la roadmap.

## Statistiques / Pilotage
- Non ajouté à la sidebar en V0.2, décision explicite pour éviter une navigation trop chargée et pour clarifier d'abord la distinction entre Finance, Trésorerie et indicateurs de pilotage. À réévaluer plus tard.
- Vrai système de statistiques avancées (le graphique actuel du tableau de bord est fictif et statique).
- Indicateurs de performance personnalisables.

## Paramètres
- Rendre fonctionnels les boutons "Modifier" des sections restantes (Préférences d'affichage, Notifications, Compte utilisateur, Objectifs mensuels, Sécurité) ; "Informations de l'entreprise" mène désormais à une vraie page (`pages/parametres-entreprise.html`, V0.6.1), mais "Enregistrer" n'y persiste rien.
- Gestion réelle du compte utilisateur et de la sécurité (mot de passe, etc.).
- **`COMPANY_SETTINGS` (V0.6.1) reste une source statique en mémoire** (un seul enregistrement fictif) : à remplacer par une vraie source de données le jour où le projet en aura une. Un logo réel (upload) reste hors périmètre (bouton "Changer le logo" en Work in progress).

## Notifications
- Vrai système de notifications (actuellement un badge fictif relié au pop-up "Work in progress").
- Panneau détaillé des notifications au clic sur la cloche.

## UX / UI
- `pages/database.html` : retirée de la navigation principale en V0.2 (le fichier existe toujours, orpheline, non liée depuis aucune page). Décision définitive (suppression du fichier ou refonte en un autre usage) à prendre lors d'une phase ultérieure.
- Travail futur sur l'identité visuelle et le logo (au-delà de l'affinage réalisé en V0.1.1).
- Amélioration responsive plus poussée (tablette/mobile), au-delà des ajustements déjà en place.
- Ajustements de design après retours utilisateurs réels.

## Technique
- Vraie base de données et sauvegarde des informations.
- Authentification réelle (comptes, sessions, sécurité).
- Recherche et filtres fonctionnels, transverses à l'application.
- Réflexion sur la sécurité et les droits d'accès utilisateurs.
- Dépôt GitHub distant à créer (voir `docs/versioning.md`).

## Idées long terme
- Application mobile / adaptation mobile complète.
- Intelligence artificielle intégrée au produit (hors périmètre explicite jusqu'à nouvel ordre).
- Gestion multi-utilisateurs pour une même entreprise.
