# Dossier js

## Rôle
Ce dossier contient la logique JavaScript de l'application : interactions, données de démonstration et calculs métier des modules Clients, Produits/Services, Devis/Factures, Agenda, Trésorerie et Analyses.

Depuis la V0.11, la configuration locale est volontairement séparée de `app.js` :
- `settings-defaults.js` définit le schéma versionné et les valeurs par défaut ;
- `settings-store.js` filtre, migre et persiste uniquement la configuration dans `localStorage` ;
- `demo-config.js` reste le point d'entrée historique chargé avant `app.js` et initialise le socle ;
- `demo-config-adapter.js` et `pilotage-config.js` maintiennent la compatibilité des anciennes interfaces globales ;
- `settings-consumers.js` raccorde les réglages aux modules existants ;
- `settings-referentials.js` applique les référentiels configurables et les alertes internes ;
- `settings-ui.js` pilote l'interface du Centre de paramètres.

Les données métier fictives restent en mémoire de page et ne sont jamais incluses dans l'export de configuration.

## Règles
- Aucun secret, mot de passe ou jeton ne doit être stocké dans le store de paramètres.
- Les propriétés inconnues d'un import doivent être refusées, jamais fusionnées arbitrairement.
- Un réglage consommé par plusieurs pages doit passer par un adaptateur partagé plutôt que par une duplication.
- Les documents historiques conservent leur snapshot ; seuls les nouveaux documents utilisent les réglages courants.
- Un backend, l'authentification réelle, la synchronisation et les notifications externes restent hors périmètre de la V0.
