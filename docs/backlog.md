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
- Tri et pagination de la liste clients (non traités en V0.4.1/V0.4.2/V0.4.3, qui se limitent à la recherche, au filtre par statut et au compteur).
- **`CLIENT_DETAILS` (V0.4.2, étendu en V0.4.3 avec `notesArchive`) reste une source statique en mémoire** : à remplacer par une vraie source de données (backend) le jour où le projet en aura une. Actuellement limitée aux 6 clients déjà présents dans `clients.html`.
- Personnalisation réelle des champs du bloc Informations client (icône "Personnaliser les champs" en Work in progress depuis la V0.4.2).
- **Vraie création/édition/suppression de notes commerciales** : les modales "Ajouter une note"/"Modifier la note"/"Supprimer cette note ?" (V0.4.3) s'ouvrent réellement (textarea pré-rempli pour l'édition, extrait pour la suppression) mais aucune validation n'est persistée. La modale "Toutes les notes commerciales" reste en lecture seule (pas d'icônes modifier/supprimer sur les notes archivées).
- Page ou panneau complet "Voir tout l'historique" des échanges (reste en Work in progress ; historique limité à 5 événements par client sur la fiche).
- Vraie liaison dynamique fiche client ↔ Agenda et fiche client ↔ Facturation : les liens "Voir dans l'agenda"/"Voir dans Facturation" (V0.4.2) pointent vers les pages génériques, sans filtrage par client.
- Téléchargement PDF réel des documents liés à un client (bouton "Télécharger PDF" en Work in progress).
- Vrai menu d'actions pour le bouton "…" de la fiche client (aucun composant de menu contextuel dans le projet à ce jour).
- Vrai ciblage d'un rendez-vous précis dans l'agenda (le lien `agenda.html?rdv=<id>` ajouté en V0.4.2.1 n'est pas encore lu par `agenda.html`).
- Le moteur de modale générique (`COCKPIT_MODAL`, V0.4.3) est réutilisable par d'autres pages si un besoin de modale apparaît ailleurs dans l'application.

## Agenda
- Vraie gestion des rendez-vous (création, modification, suppression).
- Vues jour/semaine/mois interactives.

## Facturation
- Création réelle de devis et de factures.
- Suivi réel des statuts de paiement.
- Export des documents (PDF notamment).

## Trésorerie
- Page placeholder ajoutée à la navigation en V0.2 ; développement fonctionnel réel prévu en V0.7 sur la roadmap.
- Synchronisation bancaire (hors périmètre tant qu'une vraie base de données n'existe pas).

## Produits / Services
- Page placeholder ajoutée à la navigation en V0.2 ; catalogue consultable (recherche, filtres, accès fiche) construit en V0.5.1 ; fiche produit/service complète (en-tête, résumé commercial, description commerciale, paramètres de vente, utilisation future en facturation, note interne, historique de l'offre) construite en V0.5.2.
- Vraie création, modification et suppression de produits/services (bouton "Ajouter un produit / service" du catalogue et bouton "Modifier" de la fiche restent en Work in progress).
- **Modales d'édition sur la fiche produit/service (V0.5.3, non cadrée)** : changement de statut, modification des paramètres de vente, gestion de la note interne — sur le même principe que les modales placeholder de la fiche client (V0.4.3), volontairement non construites en V0.5.2 pour rester centré sur la structure de la fiche.
- **`PRODUCT_DETAILS` (V0.5.1, enrichi en V0.5.2) reste une source statique en mémoire**, limitée aux 8 éléments fictifs du catalogue : à remplacer par une vraie source de données le jour où le projet en aura une.
- Catégories / familles de produits/services : volontairement absentes du tableau en V0.5.1 pour ne pas alourdir le catalogue ; à réévaluer plus tard si le volume le justifie.
- Unités personnalisables, gestion des stocks.
- **Vrai moteur de calcul de marge** : Coût estimé et Marge estimée (V0.5.2) restent deux champs texte statiques et indépendants, sans formule entre eux. Un futur outil devra tenir compte des coûts de production, de mise en service et de commercialisation.
- Vrai calcul de TVA (dépendant du type de société, du régime fiscal, des Paramètres), affichage d'un prix TTC : la TVA reste indicative en V0.5.1/V0.5.2.
- Historique de ventes, statistiques de performance par produit/service.
- **Historique de l'offre dynamique** : les événements affichés en V0.5.2 (`OFFER_HISTORY_TYPES`) sont statiques et écrits en dur par élément ; aucun mécanisme n'enregistre automatiquement un changement de prix, de statut ou de TVA.
- **Vraie intégration dans les devis/factures** (sélection réelle d'un produit/service dans une ligne de devis/facture, alimentée par le catalogue) : le bloc "Utilisation future en facturation" (V0.5.2) n'est qu'un résumé préparatoire (oui/non + rappel des champs repris), sans aperçu ni génération réels ; prévue une fois la Facturation construite (V0.6).
- **"Sélectionnable en devis/facture" actuellement dérivé automatiquement du statut** (V0.5.2, `STATUS_AVAILABILITY`) : à réévaluer si un jour ces deux notions doivent pouvoir diverger (ex. un produit Actif mais volontairement exclu des devis).
- Tri et pagination du catalogue (non traités en V0.5.1, qui se limite à la recherche, aux filtres type/statut et au compteur).

## Finance
- Page placeholder ajoutée à la navigation en V0.2 ; développement fonctionnel réel (bilan, compte de résultat, calculs) prévu en V0.9 sur la roadmap.

## Statistiques / Pilotage
- Non ajouté à la sidebar en V0.2, décision explicite pour éviter une navigation trop chargée et pour clarifier d'abord la distinction entre Finance, Trésorerie et indicateurs de pilotage. À réévaluer plus tard.
- Vrai système de statistiques avancées (le graphique actuel du tableau de bord est fictif et statique).
- Indicateurs de performance personnalisables.

## Paramètres
- Rendre fonctionnels les boutons "Modifier" de chaque section.
- Gestion réelle du compte utilisateur et de la sécurité (mot de passe, etc.).

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
