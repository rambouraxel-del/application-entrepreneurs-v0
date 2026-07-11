# Application Entrepreneurs — Cockpit Entrepreneur

> **État du dépôt** : `main` contient la V0.10.2 validée. La V0.11 « Centre de paramètres » est développée sur `v0.11-settings-center` et reste **en revue humaine**. Elle n'est ni fusionnée ni taguée.

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
- **Centre de paramètres V0.11** : configuration locale centralisée, recherche, import/export JSON, profil de démonstration distinct et raccordements aux modules compatibles.

## Centre de paramètres V0.11 — en revue humaine

Le centre est accessible depuis `pages/settings.html`. Il comprend :

- profil utilisateur, entreprise et profil de démonstration séparés ;
- apparence globale : densité, accent, pagination et décimales ;
- objectifs et préférences du Dashboard ;
- activation et seuils des alertes internes ;
- référentiels Clients, Agenda, Produits/Services et Trésorerie ;
- valeurs par défaut des nouveaux documents ;
- import/export strict de la configuration sans données métier ;
- indication explicite des réglages limités par la V0 ou réservés à la V1.

Les snapshots historiques des devis et factures restent figés. Les paramètres documentaires courants sont appliqués aux nouveaux documents seulement.

## Lancer le prototype

Le projet peut être servi par un serveur HTTP statique, par exemple :

```bash
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000/`. Un simple double-clic sur `index.html` fonctionne aussi dans la plupart des navigateurs, mais un serveur local facilite le contrôle des ressources.

## Tests V0.11

```bash
node --check js/settings-defaults.js
node --check js/settings-store.js
node --check js/settings-catalog.js
node --check js/settings-consumers.js
node --check js/settings-referentials.js
node --check js/settings-alerts.js
node --check js/settings-ui.js
node tests/settings-v0.11.test.js
node tests/settings-runtime.test.js
node tests/settings-paths.test.js
```

La checklist de validation visuelle se trouve dans `docs/settings-v0.11.md`. La fusion et le tag restent interdits avant validation humaine explicite.

## Limites avant la V1

La V1 devra notamment apporter un backend, une base de données, l'authentification, les rôles, la synchronisation, le stockage sécurisé des fichiers, une numérotation comptable persistante et les notifications externes.

Voir aussi : `docs/changelog.md`, `docs/roadmap-v0bis.md`, `docs/backlog.md`, `docs/versioning.md` et `PROJECT_INDEX.md`.
