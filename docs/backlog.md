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
- Création, modification et suppression réelles de clients.
- Fiches clients détaillées.
- Recherche et filtres fonctionnels sur la liste des clients.

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
- Page placeholder ajoutée à la navigation en V0.2 ; développement fonctionnel réel (vrai catalogue, création/modification) prévu en V0.8 sur la roadmap.
- Gestion des stocks.

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
