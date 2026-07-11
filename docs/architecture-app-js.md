# Cartographie de `js/app.js`

> `app.js` (~11 460 lignes) reste un fichier unique par choix assumé de la V0 (voir `docs/decisions.md`). Cette cartographie sert de repère pour la navigation et prépare un éventuel découpage en V1 ; elle ne déclenche aucun refactoring en V0.12.

## Structure

Le fichier est une suite d'environ 34 IIFE `(function () { ... })();` séquentielles, chacune généralement précédée d'un bloc de commentaires. Pas de séparateurs systématiques, sauf pour le bloc Dashboard (`// ===`).

| # | Section | Rôle |
|---|---|---|
| 1 | Bootstrap login | Redirection du bouton de connexion vers `dashboard.html` |
| 2 | Pop-up "Work in progress" | Composant global `.btn-wip`, partagé par toutes les pages |
| 3 | Modal générique | `window.COCKPIT_MODAL` (open/close), socle des modales |
| 4 | Pagination de liste générique | `window.COCKPIT_LIST_PAGINATION.init()`, réutilisé par les tableaux |
| 5-6 | Référentiel + données démo Clients | `CLIENT_STATUSES`, `CLIENT_DETAILS` |
| 7 | Entreprise + module Devis | `COMPANY_SETTINGS`, `DEVIS_DETAILS`, `COCKPIT_DEVIS_CALC` |
| 8 | Module Factures | `FACTURE_DETAILS`, `COCKPIT_FACTURE_CALC` |
| 9 | Module RDV/Agenda (données + calcul) | `RDV_DETAILS`, `COCKPIT_AGENDA_CALC` |
| 10 | Stats facturation dashboard | `COCKPIT_FACTURATION_STATS` |
| 11 | Module Trésorerie (données + calcul) | `COCKPIT_TRESORERIE_CALC` |
| 12 | Moteur de calcul Analyses | `COCKPIT_ANALYSES_CALC` |
| 13-14 | Page Fiche client (rendu) | `renderClient`, notes, historique, RDV, documents |
| 15-16 | Référentiel + page Fiche produit/service | `PRODUCT_DETAILS`, `renderItem` |
| 17-20 | Facturation (résumé, onglets, tableaux devis/factures) | Câblage des listes devis/factures |
| 21 | Paramètres > Infos entreprise (lecture seule) | Affichage `COMPANY_SETTINGS` |
| 22-23 | Édition Devis / Édition Facture | Deux grosses IIFE largement dupliquées (assumé, voir `docs/decisions.md` V0.6.2) |
| 24-25 | Impression Devis / Facture | Vues imprimables lecture seule |
| 26-27 | Agenda — vues calendrier + liste | Rendu Semaine/Jour/Mois/Liste |
| 28 | Page Fiche RDV (édition) | Très grosse IIFE : modales préparation, communication, statut, priorité |
| 29 | Impression RDV | Vue imprimable |
| 30 | Page Trésorerie | KPIs, mouvements, charges, alertes, graphique |
| 31 | Page Analyses | Onglets, KPI, donuts, insights |
| 32-34 | Dashboard | Salutation démo, Paramètres > Compte/Pilotage, cockpit quotidien (Situation générale, mini-agenda, to-do, Performance, Dynamique commerciale) — alertes pilotées uniquement par `js/settings-alerts.js` depuis V0.12 |

Pas de section dédiée pour `login.html`/`database.html` (supprimée en V0.12) : elles ne chargent que les composants globaux.

## Duplication connue (non traitée en V0.12, hors périmètre)

- **`makeEl(tag, className, text)`** redéfini à l'identique dans ~12 IIFE différentes (une par page ayant son propre rendu DOM).
- Helpers plus petits répétés 2 à 4 fois entre IIFE : `findStatusInfo`, `buildModalFooterButtons`, `pad2`, `formatDateFr`, `renderHistory`, `makeSummaryRow`.
- `snapshotClient` défini deux fois (module devis/entreprise et module RDV).
- Duplication assumée et documentée entre les IIFE devis-édition et facture-édition (voir `docs/decisions.md`, V0.6.2).

Ces duplications sont **volontaires ou historiquement acceptées** (pages indépendantes, pas de système de composants en V0) et ne sont pas du code mort : chaque copie est utilisée localement.

## Proposition de découpage pour la V1

Si `app.js` doit être scindé en V1 (avec un vrai système de build/modules) :

1. **`core/`** : composants globaux partagés (modal, pagination générique, pop-up WIP, `makeEl` unique).
2. **`data/`** : les objets de données fictives et référentiels par domaine (`CLIENT_DETAILS`, `DEVIS_DETAILS`, `FACTURE_DETAILS`, `RDV_DETAILS`, `PRODUCT_DETAILS`, `TRESORERIE_OPERATIONS`).
3. **`calc/`** : les moteurs de calcul purs, déjà bien isolés (`COCKPIT_DEVIS_CALC`, `COCKPIT_FACTURE_CALC`, `COCKPIT_AGENDA_CALC`, `COCKPIT_TRESORERIE_CALC`, `COCKPIT_ANALYSES_CALC`, `COCKPIT_FACTURATION_STATS`) — ce sont déjà des objets `window.COCKPIT_*` autonomes, donc les premiers candidats à extraire sans risque.
4. **`pages/`** : un module par page (fiche client, fiche produit, devis-édition, facture-édition, agenda, fiche-rdv, trésorerie, analyses, dashboard), chacun import/require les modules `core`/`data`/`calc` au lieu de redéfinir ses propres helpers.

Cette proposition n'engage aucune action en V0.12 : elle documente une trajectoire possible, à valider avant la V1.
