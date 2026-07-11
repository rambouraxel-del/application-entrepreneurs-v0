# Application Entrepreneurs — Cockpit Entrepreneur

> **État du dépôt** : `main` contient la V0.11.1 « Centre de paramètres » fusionnée et validée. La V0.12 (assainissement global avant V1) est développée sur `v0.12-audit-global` et reste **en revue humaine**. Elle n'est ni fusionnée ni taguée.

## Objectif

Prototype HTML/CSS/JavaScript natif destiné à tester un cockpit de pilotage pour entrepreneurs et TPE : Clients, Agenda, Produits/Services, Devis/Factures, Trésorerie, Analyses et Dashboard quotidien.

## État fonctionnel de la V0

Les modules travaillent sur un jeu de données fictif chargé dans `js/app.js`. Les créations et modifications métier restent en mémoire de la page : clients, rendez-vous, produits, devis, factures, paiements et opérations ne constituent pas une base de données et ne survivent généralement pas au rechargement.

**Exception introduite par la V0.11** : la configuration du Centre de paramètres est persistée localement dans le navigateur avec `localStorage`, sous la clé `cockpit.settings.v1`. Cette persistance concerne uniquement les préférences et référentiels de configuration ; elle n'est ni une sauvegarde cloud, ni une synchronisation multi-appareil, ni un stockage sécurisé.

## Modules disponibles

- **Dashboard** : période de pilotage, KPI, objectifs, mini-agenda, tâches, source unique d'alertes, graphique et tunnel commercial.
- **Clients / CRM** : liste, statuts, recherche, pagination, fiche client et documents liés.
- **Agenda** : vues Jour/Semaine/Mois/Liste, fiche rendez-vous, préparation commerciale et devis brouillon lié.
- **Produits / Services** : catalogue, types, statuts, TVA, paramètres commerciaux et fiche détaillée.
- **Facturation** : devis versionnés, factures, paiements, conversion devis → facture et documents imprimables.
- **Trésorerie** : mouvements, charges, factures à encaisser, projection et alertes.
- **Analyses** : vues transversales Commercial, Clients, Activité et Trésorerie.
- **Centre de paramètres V0.11** : configuration locale centralisée, recherche, maintenance de l’affichage et raccordements aux modules compatibles.

## Centre de paramètres V0.11 — validé

Le centre est accessible depuis `pages/settings.html`. Il comprend :

- profil utilisateur et informations de l’entreprise séparés ;
- apparence globale : densité, accent, pagination et décimales ;
- objectifs et préférences du Dashboard ;
- activation et seuils des alertes internes ;
- référentiels Clients, Agenda, Produits/Services et Trésorerie ;
- valeurs par défaut des nouveaux documents ;
- maintenance locale limitée au vidage du cache et à la réinitialisation des préférences d’affichage.

Les snapshots historiques des devis et factures restent figés. Les paramètres documentaires courants sont appliqués aux nouveaux documents seulement.

## Lancer le prototype

Le projet peut être servi par un serveur HTTP statique, par exemple :

```bash
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000/`. Un simple double-clic sur `index.html` fonctionne aussi dans la plupart des navigateurs, mais un serveur local facilite le contrôle des ressources.

## Tests

```bash
npm test
```

Lance tous les fichiers `tests/*.test.js` sans dépendance externe (voir `package.json`). La checklist de validation visuelle du Centre de paramètres se trouve dans `docs/settings-v0.11.md`.

## Limites avant la V1

La V1 devra notamment apporter un backend, une base de données, l'authentification, les rôles, la synchronisation, le stockage sécurisé des fichiers, une numérotation comptable persistante et les notifications externes.

Voir aussi : `docs/changelog.md`, `docs/roadmap-v0bis.md`, `docs/backlog.md`, `docs/versioning.md`, `docs/decisions.md`, `docs/settings-v0.11.md`, `docs/architecture-app-js.md` et `PROJECT_INDEX.md`.
