# Dossier js

`app.js` contient les données fictives et les moteurs métier historiques. La V0.11 ajoute un socle séparé pour la configuration :

- `settings-defaults.js` : schéma v2 ;
- `settings-store.js` : stockage local, migration, validation, import/export ;
- `settings-catalog.js` : libellés, descriptions, synonymes et statut fonctionnel/V1 ;
- `settings-consumers.js` : raccordements réels aux modules ;
- `settings-referentials.js` : statuts, types et catégories sans collision ;
- `settings-alerts.js` : source unique d'alertes du Dashboard ;
- `settings-ui.js` : Centre de paramètres ;
- `demo-config.js`, `demo-config-adapter.js` et `pilotage-config.js` : compatibilité avec l'existant.

Aucune donnée métier ni donnée sensible ne doit être enregistrée dans le store. Les snapshots historiques des documents ne doivent jamais être réécrits.
