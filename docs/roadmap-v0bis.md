# Roadmap V0 bis

| Phase | Contenu | Statut |
|---|---|---|
| V0.1 à V0.10.2 | Refonte graphique, navigation, CRM, Produits/Services, Facturation, Agenda, Trésorerie, Analyses, cohérence UI/UX et Dashboard quotidien | Validées |
| V0.11 | Centre de paramètres central, persistance locale de la configuration et raccordement aux modules | Validée (fusionnée sur `main`) |
| V0.12 | Assainissement global : documentation, fichiers inutiles, corrections fonctionnelles ciblées avant V1 | **En cours** (`v0.12-audit-global`) |
| V0.13 | Étape 1 — Recentrage produit : positionnement formalisé (`docs/positionnement-produit.md`), textes du Dashboard/Analyses/connexion alignés sur la logique Centraliser → Comprendre → Agir | Réalisée |
| V1 | Version fonctionnelle stable : backend, données persistantes, authentification et synchronisation | À venir |

## Prochaines priorités (après le recentrage produit)

1. **Recentrage produit** — positionnement, vocabulaire et hiérarchie des pages alignés sur le rôle de cockpit de pilotage (V0.13, ci-dessus).
2. **Dashboard décisionnel** — améliorer la logique de lecture du Dashboard (situation, attention, actions, évolution) et l'usage des données déjà disponibles, sans nouveau moteur de recommandations à ce stade.
3. **Tests utilisateurs** — confronter le positionnement et le Dashboard à de vrais indépendants/TPE cibles.
4. **Définition du MVP** — arbitrer le périmètre minimal viable à partir des retours utilisateurs.
5. **V1 technique** — backend, données persistantes, authentification, synchronisation.
6. **Intégrations** — connexions aux outils tiers pertinents pour la cible.
7. **Bêta** — mise à disposition contrôlée auprès d'utilisateurs réels.
8. **Commercialisation**.

## V0.11

La V0.11 centralise les réglages annoncés comme personnalisables. Elle distingue :

- les réglages réellement consommés dans la V0 ;
- les réglages à effet limité, notamment sur des créations métier encore en mémoire ;
- les capacités réservées à la V1, affichées comme telles et non simulées.

La configuration est persistée dans le navigateur courant. Les données métier ne le sont pas. Les snapshots historiques des devis et factures restent immuables.

La V0.11.1 a été validée puis fusionnée dans `main`.

## V0.12

La V0.12 est consacrée à l'assainissement global du dépôt avant la V1 : mise à jour documentaire, suppression des fichiers inutiles, consolidation de `settings-finalize.js`, corrections fonctionnelles ciblées (statuts Agenda, moteur d'alertes unique, pagination, date dynamique, actions factices) et cartographie de `app.js`. Développée sur `v0.12-audit-global`, sans merge ni tag avant validation humaine.

## V0.13

L'Étape 1 du plan d'action produit vise à recentrer le discours de l'application : elle ne doit plus se présenter comme une simple collection de modules de gestion, mais comme un cockpit de pilotage destiné aux indépendants et TPE de services (1 à 10 personnes), organisé autour de Centraliser → Comprendre → Agir. Voir `docs/positionnement-produit.md` (source de vérité produit) et `docs/decisions.md`. Périmètre fonctionnel inchangé ; seuls les textes, titres et sous-titres du Dashboard, de la page Analyses et de la page de connexion ont été révisés.

## V1

La V1 devra remplacer les données fictives en mémoire par un socle durable : backend, base de données, comptes, rôles, synchronisation, stockage de documents, notifications et numérotation comptable fiable.
