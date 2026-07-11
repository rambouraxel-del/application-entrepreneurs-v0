# Roadmap V0 bis

| Phase | Contenu | Statut |
|---|---|---|
| V0.1 à V0.10.2 | Refonte graphique, navigation, CRM, Produits/Services, Facturation, Agenda, Trésorerie, Analyses, cohérence UI/UX et Dashboard quotidien | Validées |
| V0.11 | Centre de paramètres central, persistance locale de la configuration et raccordement aux modules | Validée (fusionnée sur `main`) |
| V0.12 | Assainissement global : documentation, fichiers inutiles, corrections fonctionnelles ciblées avant V1 | **En cours** (`v0.12-audit-global`) |
| V1 | Version fonctionnelle stable : backend, données persistantes, authentification et synchronisation | À venir |

## V0.11

La V0.11 centralise les réglages annoncés comme personnalisables. Elle distingue :

- les réglages réellement consommés dans la V0 ;
- les réglages à effet limité, notamment sur des créations métier encore en mémoire ;
- les capacités réservées à la V1, affichées comme telles et non simulées.

La configuration est persistée dans le navigateur courant. Les données métier ne le sont pas. Les snapshots historiques des devis et factures restent immuables.

La V0.11.1 a été validée puis fusionnée dans `main`.

## V0.12

La V0.12 est consacrée à l'assainissement global du dépôt avant la V1 : mise à jour documentaire, suppression des fichiers inutiles, consolidation de `settings-finalize.js`, corrections fonctionnelles ciblées (statuts Agenda, moteur d'alertes unique, pagination, date dynamique, actions factices) et cartographie de `app.js`. Développée sur `v0.12-audit-global`, sans merge ni tag avant validation humaine.

## V1

La V1 devra remplacer les données fictives en mémoire par un socle durable : backend, base de données, comptes, rôles, synchronisation, stockage de documents, notifications et numérotation comptable fiable.
