# V0.11 — Centre de paramètres

> Statut : **en revue humaine** sur `v0.11-settings-center`. Aucun merge et aucun tag avant validation.

## Architecture

- Schéma v2 dans `settings-defaults.js`.
- Store local strict dans `settings-store.js`.
- Catalogue fonctionnel/recherche dans `settings-catalog.js`.
- Raccordements dans `settings-consumers.js` et `settings-referentials.js`.
- Source unique d'alertes dans `settings-alerts.js`.
- Apparence globale dans `css/preferences.css`.

## Persistance

Seule la configuration est enregistrée sous `cockpit.settings.v1`. Les données métier restent fictives et non persistantes. L'import/export n'inclut aucune donnée métier.

## Compatibilité documentaire

Les snapshots historiques des devis et factures sont immuables. Les nouveaux documents utilisent l'identité et les valeurs par défaut courantes.

## Réglages réservés à la V1

Langue complète, format de date global, fuseaux horaires, semaine commençant le dimanche, format 12 h, création persistante de clients/produits, champs personnalisés, unités/familles métier, comparaison analytique complète, authentification et notifications externes.

## Checklist humaine finale

1. Parcourir toutes les sections et vérifier les badges V0/V1.
2. Modifier puis recharger Profil, Entreprise, Apparence, Dashboard et référentiels.
3. Vérifier les recherches TVA, horaires, objectif, devis, notification, statut client, trésorerie, acompte et week-end.
4. Tester import/export et le résumé de confirmation.
5. Activer la démonstration et confirmer que les autres sections sont conservées.
6. Vérifier Dashboard, Clients, Agenda, Produits, Facturation, Trésorerie et Analyses sur desktop et mobile.
7. Contrôler un document historique puis créer un nouveau brouillon.
8. Vérifier qu'une alerte n'apparaît qu'une fois.
9. Contrôler la console et les ressources réseau.
