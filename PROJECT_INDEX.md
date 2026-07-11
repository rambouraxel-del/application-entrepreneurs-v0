# Sommaire du projet

```text
application-entrepreneurs-v0/
├── index.html
├── README.md
├── PROJECT_INDEX.md
├── css/
│   ├── styles.css              Charte globale historique
│   ├── preferences.css         Densité et accent V0.11, chargés sur toutes les pages
│   ├── settings.css            Mise en page du Centre de paramètres
│   └── print.css               Impression des documents
├── js/
│   ├── app.js                  Données fictives et moteurs métier V0
│   ├── demo-config.js          Chargeur commun avant app.js
│   ├── demo-config-adapter.js  Compatibilité du profil de démonstration
│   ├── pilotage-config.js      Compatibilité des préférences Dashboard
│   ├── settings-defaults.js    Schéma v2 et valeurs par défaut
│   ├── settings-store.js       Persistance locale, migration, import/export
│   ├── settings-catalog.js     Métadonnées, capacités et recherche
│   ├── settings-consumers.js   Raccordements aux modules
│   ├── settings-referentials.js Référentiels configurables
│   ├── settings-alerts.js      Source unique d'alertes Dashboard
│   └── settings-ui.js          Interface du Centre de paramètres
├── pages/
│   ├── settings.html           Centre de paramètres V0.11
│   ├── dashboard.html
│   ├── clients.html / fiche-client.html
│   ├── agenda.html / fiche-rdv.html / rdv-document.html
│   ├── produits-services.html / fiche-produit-service.html
│   ├── facturation.html / devis-* / facture-*
│   ├── tresorerie.html
│   └── analyses.html
├── tests/
│   ├── settings-v0.11.test.js
│   ├── settings-runtime.test.js
│   └── settings-paths.test.js
└── docs/
    ├── changelog.md
    ├── decisions.md
    ├── roadmap-v0bis.md
    ├── backlog.md
    ├── versioning.md
    └── settings-v0.11.md
```

## Sources de vérité

- Le store V0.11 contient uniquement la configuration locale.
- `app.js` conserve les données métier fictives et non persistantes.
- Les paramètres marqués V1 dans le catalogue ne sont pas simulés.
- `main` reste la branche validée ; la V0.11 demeure sur `v0.11-settings-center` jusqu'à approbation.
