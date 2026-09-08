# Dossier js

`app.js` contient les données fictives et les moteurs métier historiques. La V0.11 ajoute un socle séparé pour la configuration :

- `settings-defaults.js` : schéma v2 ;
- `settings-store.js` : stockage local, migration, validation, import/export ;
- `settings-catalog.js` : libellés, descriptions, synonymes et statut fonctionnel/V1 ;
- `settings-consumers.js` : raccordements réels aux modules ;
- `settings-referentials.js` : statuts, types et catégories sans collision ;
- `settings-ui.js` : Centre de paramètres ;
- `demo-config.js`, `demo-config-adapter.js` et `pilotage-config.js` : compatibilité avec l'existant.

La V0.13 ajoute :

- `insights-engine.js` : moteur d'insights décisionnel du Dashboard (`window.COCKPIT_INSIGHTS_ENGINE`) — règles déterministes qui transforment les données existantes en constats (alertes, priorités du jour, opportunités). Ne touche pas au DOM, testable indépendamment du rendu. Voir `docs/insights-engine.md`.

Chargé dynamiquement par `demo-config.js` comme le reste du socle, donc disponible sur toutes les pages sans balise `<script>` supplémentaire.

`settings-alerts.js` (V0.11, ancienne source d'alertes du Dashboard) a été supprimé en V0.13.1 : entièrement remplacé par `insights-engine.js` depuis la V0.13, il n'était plus chargé nulle part et ne protégeait plus de comportement réel (voir `docs/decisions.md`).

Aucune donnée métier ni donnée sensible ne doit être enregistrée dans le store. Les snapshots historiques des documents ne doivent jamais être réécrits.
