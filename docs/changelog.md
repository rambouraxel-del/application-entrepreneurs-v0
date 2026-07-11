# Changelog

> Ce fichier synthétise les versions du prototype. L'historique Git conserve le détail des anciens commits. La V0.11.1 est fusionnée et validée sur `main`. La V0.12 (assainissement global) est en cours sur `v0.12-audit-global`.

## V0.11 — Centre de paramètres — validée

### Première implémentation

- Centre de paramètres avec navigation secondaire, recherche, sauvegarde par section et import/export JSON.
- Schéma versionné et persistance locale de la configuration dans `localStorage`.
- Profil utilisateur, entreprise et profil de démonstration distincts.
- Référentiels et adaptateurs pour les modules existants.

### Correctifs de finalisation

- raccordement réel des paramètres aux modules compatibles ;
- classification visible des réglages limités par la V0 ou réservés à la V1 ;
- apparence globale déplacée dans `css/preferences.css`, chargée sur toutes les pages ;
- schéma v2 : identifiants de référentiels uniques, collisions `id`/`legacyId` interdites et absence d'héritage automatique d'un `legacyId` ;
- mode Démonstration rendu non destructif ;
- recherche enrichie avec descriptions, synonymes et mots-clés ;
- résumé détaillé avant import JSON ;
- vue d'accueil enrichie et liste des informations essentielles manquantes ;
- remplacement des alertes V0.10.2 par une seule source d'affichage configurée, sans liste parallèle ;
- tests Node du store, des migrations, des référentiels, de la recherche et des adaptateurs.

Les données métier restent fictives et non persistantes. Seule la configuration V0.11 survit au rechargement dans le navigateur courant.

## V0.10

- **V0.10.1** : harmonisation globale UI/UX et documentation.
- **V0.10.2** : Dashboard reconstruit en cockpit quotidien à trois niveaux — Situation générale, Ma journée, Performance.

## V0.9

- Module Finance renommé **Analyses**, cockpit transversal alimenté par Facturation, Clients, Agenda et Trésorerie.
- V0.9.1 : refonte visuelle du module.
- V0.9.2 : configuration personnalisable des démonstrations.

## V0.8

Module Trésorerie : solde, mouvements, charges, factures à encaisser, projection et alertes.

## V0.7

Agenda commercial, fiche rendez-vous, préparation, communication, historique, devis brouillon lié et vues calendrier Jour/Semaine/Mois.

## V0.6

Paramètres entreprise, devis, factures, paiements, documents imprimables et intégration commerciale dans la fiche client et le Dashboard.

## V0.5

Catalogue et fiches Produits/Services, interactions préparatoires et pagination générique.

## V0.4

Liste Clients, fiche CRM complète, statuts, notes, rendez-vous et documents liés.

## V0.1 à V0.3

Refonte graphique, structuration Git/GitHub, navigation générale et premières interactions du Dashboard.

## V0 initiale

Étapes 0 à 10 : socle HTML/CSS/JavaScript, connexion fictive, navigation, pages principales, pop-up Work in progress, harmonisation et première livraison documentaire.
