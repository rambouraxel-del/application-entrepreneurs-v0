# Roadmap V0 bis

| Phase | Contenu | Statut |
|---|---|---|
| V0.1 à V0.10.2 | Refonte graphique, navigation, CRM, Produits/Services, Facturation, Agenda, Trésorerie, Analyses, cohérence UI/UX et Dashboard quotidien | Validées |
| V0.11 | Centre de paramètres central, persistance locale de la configuration et raccordement aux modules | **En revue humaine** |
| V0.12 | Revue humaine exhaustive de cohérence, ergonomie, lisibilité et qualité globale avant V1 | À venir |
| V1 | Version fonctionnelle stable : backend, données persistantes, authentification et synchronisation | À venir |

## V0.11

La V0.11 centralise les réglages annoncés comme personnalisables. Elle distingue :

- les réglages réellement consommés dans la V0 ;
- les réglages à effet limité, notamment sur des créations métier encore en mémoire ;
- les capacités réservées à la V1, affichées comme telles et non simulées.

La configuration est persistée dans le navigateur courant. Les données métier ne le sont pas. Les snapshots historiques des devis et factures restent immuables.

La phase reste sur `v0.11-settings-center` jusqu'à validation humaine. Aucun merge et aucun tag avant cette validation.

## V0.12

La V0.12 sera consacrée à une revue humaine transversale : cohérence des pages, dimensions, navigation, lisibilité, ergonomie, responsive, parcours métier, textes, états vides, erreurs et dette visuelle.

## V1

La V1 devra remplacer les données fictives en mémoire par un socle durable : backend, base de données, comptes, rôles, synchronisation, stockage de documents, notifications et numérotation comptable fiable.
