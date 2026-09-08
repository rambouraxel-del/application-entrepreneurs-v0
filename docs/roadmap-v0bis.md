# Roadmap V0 bis

| Phase | Contenu | Statut |
|---|---|---|
| V0.1 à V0.10.2 | Refonte graphique, navigation, CRM, Produits/Services, Facturation, Agenda, Trésorerie, Analyses, cohérence UI/UX et Dashboard quotidien | Validées |
| V0.11 | Centre de paramètres central, persistance locale de la configuration et raccordement aux modules | Validée (fusionnée sur `main`) |
| V0.12 | Assainissement global : documentation, fichiers inutiles, corrections fonctionnelles ciblées avant V1 | **En cours** (`v0.12-audit-global`) |
| V0.12.1 | Étape 1 — Recentrage produit : positionnement formalisé (`docs/positionnement-produit.md`), textes du Dashboard/Analyses/connexion alignés sur la logique Centraliser → Comprendre → Agir | Réalisée |
| V0.13 | Prototype décisionnel : moteur d'insights (`docs/insights-engine.md`) et Dashboard réorganisé en 5 niveaux (situation, attention, priorités du jour, opportunités, performance) | Validée |
| V0.13.1 | Préparation aux tests utilisateurs : dates de démonstration relatives, re-diagnostic du topbar mobile, suppression de `js/settings-alerts.js` | Validée |
| Étape 4 | Définition du MVP commercial : périmètre P0/P1/P2, socle SaaS, modèle de données conceptuel (`docs/mvp-commercial.md`) | Cadrage réalisé, aucune donnée utilisateur — voir le registre d'hypothèses |
| Étape 5 | Conception de l'architecture technique V1 : stack, monolithe modulaire, multi-tenant, modèle de données, workflow financier, roadmap technique (`docs/v1/`) | Conception réalisée, à relire et valider |
| V1 | Version fonctionnelle stable : backend, données persistantes, authentification et synchronisation, construite sur le périmètre P0 de `docs/mvp-commercial.md` et l'architecture de `docs/v1/architecture.md` | À venir |

## Prochaines priorités

1. **Recentrage produit** — positionnement, vocabulaire et hiérarchie des pages alignés sur le rôle de cockpit de pilotage (V0.12.1, réalisée).
2. **Dashboard décisionnel** — moteur d'insights (alertes, priorités du jour, opportunités) à partir des données déjà disponibles (V0.13, réalisée).
3. **Définition du MVP commercial** — périmètre P0/P1/P2/hors périmètre, socle SaaS, réglementaire, modèle de données conceptuel (`docs/mvp-commercial.md`, réalisée). Tests utilisateurs temporairement reportés ; aucune hypothèse de ce document n'est validée (voir son registre d'hypothèses).
4. **Conception de l'architecture V1** — stack, frontières, multi-tenant, argent, documents, roadmap technique en lots verticaux (`docs/v1/`, réalisée). Aucune ligne de V1 écrite.
5. **Tests utilisateurs** — confronter le positionnement, le Dashboard et le périmètre MVP à de vrais indépendants/TPE cibles.
6. **V1 technique** — construction par lots verticaux, sur le périmètre P0 et l'architecture définis.
7. **Intégrations** — connexions aux outils tiers pertinents pour la cible (priorisées dans `docs/mvp-commercial.md`).
8. **Bêta** — mise à disposition contrôlée auprès d'utilisateurs réels.
9. **Commercialisation**.

## V0.11

La V0.11 centralise les réglages annoncés comme personnalisables. Elle distingue :

- les réglages réellement consommés dans la V0 ;
- les réglages à effet limité, notamment sur des créations métier encore en mémoire ;
- les capacités réservées à la V1, affichées comme telles et non simulées.

La configuration est persistée dans le navigateur courant. Les données métier ne le sont pas. Les snapshots historiques des devis et factures restent immuables.

La V0.11.1 a été validée puis fusionnée dans `main`.

## V0.12

La V0.12 est consacrée à l'assainissement global du dépôt avant la V1 : mise à jour documentaire, suppression des fichiers inutiles, consolidation de `settings-finalize.js`, corrections fonctionnelles ciblées (statuts Agenda, moteur d'alertes unique, pagination, date dynamique, actions factices) et cartographie de `app.js`. Développée sur `v0.12-audit-global`, sans merge ni tag avant validation humaine.

## V0.12.1

L'Étape 1 du plan d'action produit vise à recentrer le discours de l'application : elle ne doit plus se présenter comme une simple collection de modules de gestion, mais comme un cockpit de pilotage destiné aux indépendants et TPE de services (1 à 10 personnes), organisé autour de Centraliser → Comprendre → Agir. Voir `docs/positionnement-produit.md` (source de vérité produit) et `docs/decisions.md`. Périmètre fonctionnel inchangé ; seuls les textes, titres et sous-titres du Dashboard, de la page Analyses et de la page de connexion ont été révisés.

## V0.13

Prototype décisionnel : le Dashboard est réorganisé en cinq niveaux de lecture (Ma situation, À surveiller, Mes priorités du jour, Opportunités, Performance) et un moteur d'insights déterministe (`js/insights-engine.js`) transforme les données déjà chargées (clients, devis, factures, rendez-vous, trésorerie, tâches) en constats actionnables. Voir `docs/insights-engine.md` pour le détail des règles et `docs/decisions.md` pour les décisions structurantes. Périmètre technique inchangé (pas de backend, pas d'IA, pas de nouveau module).

## V0.13.1

Version corrective courte, sans enrichissement fonctionnel, pour préparer les tests utilisateurs : dates de quelques données de démonstration rendues relatives à la date du jour (rendez-vous, devis, facture, dernier contact client) via un helper centralisé plutôt que codées en dur ; re-diagnostic du débordement horizontal du topbar mobile signalé en V0.13 (non reproductible après mesure précise, durcissement CSS préventif appliqué) ; suppression de `js/settings-alerts.js`, devenu totalement inutilisé depuis la V0.13. Voir `docs/decisions.md`.

## Étape 4 — Définition du MVP commercial

Les tests utilisateurs initialement prévus après la V0.13.1 sont temporairement reportés. À la place, cadrage du périmètre de la première version commercialisable : `docs/mvp-commercial.md` définit le parcours cœur, le périmètre P0/P1/P2/hors périmètre par domaine, le socle SaaS indispensable (comptes, isolation des données, sauvegarde, abonnement), la frontière réglementaire de la facturation électronique, le modèle de données conceptuel et les écrans du MVP. Purement un exercice de cadrage produit : aucun développement V1, aucune nouvelle fonctionnalité, aucune modification du Dashboard ou du moteur d'insights. Comme aucun test utilisateur n'a encore eu lieu, le document distingue explicitement faits observés, choix produit et hypothèses, et tient un registre des hypothèses à valider dès la reprise des tests utilisateurs.

## Étape 5 — Conception de l'architecture technique V1

Conception uniquement, sans aucune implémentation : `docs/v1/architecture.md` devient la source de vérité technique de la V1, complétée par `data-model.md`, `security.md` et `migration-v0-v1.md`. Décisions structurantes : monolithe modulaire Next.js/TypeScript sur PostgreSQL, authentification déléguée, isolation multi-tenant garantie par un filtrage automatique et des tests bloquants, argent en centimes entiers, immutabilité des documents émis par snapshots, numérotation par compteur transactionnel, moteur d'insights calculé à la demande et resté déterministe. La V1 est construite comme une nouvelle application reprenant les concepts validés de la V0, et non par refactoring progressif de `js/app.js`. La roadmap technique est découpée en six lots verticaux livrant chacun quelque chose de vérifiable.

## V1

La V1 devra remplacer les données fictives en mémoire par un socle durable : backend, base de données, comptes, rôles, synchronisation, stockage de documents, notifications et numérotation comptable fiable.
