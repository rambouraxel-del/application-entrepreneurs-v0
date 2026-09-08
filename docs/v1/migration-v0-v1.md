# Migration V0 → V1 — Cockpit Entrepreneur

> Complète [`architecture.md`](architecture.md). Répond à une seule question, tranchée ici : **faut-il faire évoluer la V0 vers la V1, ou construire la V1 à côté en reprenant ce que la V0 a validé ?**

---

## 1. La décision

> **La V1 est une nouvelle application, construite à côté. La V0 devient une spécification fonctionnelle et visuelle, figée en lecture seule.**

Ce n'est pas un rejet de la V0 : c'est la reconnaissance de ce qu'elle est. La V0 a rempli exactement sa mission — explorer le produit, valider des workflows, faire émerger un cockpit décisionnel, fixer un positionnement et un périmètre MVP. Sa valeur est **ce qu'elle a prouvé**, pas le code qui l'a prouvé.

### Pourquoi pas un refactoring progressif

Un refactoring progressif suppose qu'il existe une structure porteuse à conserver. L'audit montre le contraire :

| Constat d'audit | Conséquence |
|---|---|
| `js/app.js` : 11 628 lignes, ~34 IIFE séquentielles, communication par singletons `window.COCKPIT_*` | Aucune frontière de module à préserver ; tout serait à découper avant de pouvoir migrer quoi que ce soit |
| Aucun typage, aucune étape de compilation, aucun gestionnaire de dépendances (`package.json` sans aucune dépendance) | Le socle V1 (TypeScript, ORM, tests d'intégration) ne se greffe pas dessus : il le remplace |
| Données métier **écrites en dur dans le HTML** de `pages/*.html`, lues par le JS pour filtrer | Chaque page serait à réécrire de toute façon dès la première donnée persistée |
| `localStorage` comme stockage de configuration | Remplacé par une table, sans continuité possible |
| Aucune notion d'organisation, d'utilisateur, de transaction | Le multi-tenant et l'argent — les deux exigences les plus structurantes — touchent une couche de données qui n'existe pas |
| Aucune donnée de production, aucun utilisateur réel | **Aucune contrainte de continuité** : le principal argument en faveur d'un refactoring progressif est absent |

Un refactoring progressif imposerait de maintenir deux paradigmes dans un même fichier pendant des mois, sans jamais livrer d'incrément vérifiable — exactement ce que la roadmap en lots verticaux cherche à éviter.

### Ce que coûte la décision, honnêtement

Reconstruire l'interface a un coût réel : dix-sept pages HTML, une charte graphique aboutie, des états vides soignés, des libellés travaillés sur trois itérations produit. Ce coût est assumé pour deux raisons : le périmètre MVP **supprime déjà** une partie de ces écrans (page Analyses repoussée, vues calendrier reportées, fiche client allégée, paramètres réduits de 14 sections à une poignée), et la charte visuelle est portable telle quelle sous forme de tokens de design. Ce qui est réécrit, c'est le squelette technique — pas le travail de conception.

---

## 2. Réutilisé conceptuellement

Ce qui a été validé par trois itérations produit et qui **guide** la V1 sans être copié ligne à ligne.

| Élément | Où il vit en V0 | Statut en V1 |
|---|---|---|
| **Hiérarchie du Dashboard en 5 niveaux** (situation, attention, priorités, opportunités, performance) | `pages/dashboard.html`, `docs/insights-engine.md` | Spécification directe de l'écran principal |
| **Les 8 règles d'insights** et leurs seuils | `js/insights-engine.js`, `docs/insights-engine.md` | Spécification **et** code porté (§3) — aucune règle nouvelle en V1 |
| **Sémantique des statuts** devis et factures | `computeStatutAffiche`, référentiels de statuts | Reprise telle quelle dans le modèle de données |
| **Séquence de calcul** remise → HT → TVA → TTC, TVA récapitulée par taux | `computeLine`, `computeDevisTotals` | Sémantique conservée, implémentation refaite en centimes entiers |
| **Immutabilité par snapshots** (`clientSnapshot`, `companySnapshot`) | Modules devis et factures | Concept central de la V1, renforcé par un trigger de base |
| **Numéro absent sur les brouillons** | `numero: null` sur les brouillons | Devient une règle explicite : le numéro est alloué à l'émission |
| **Charte graphique** : couleurs, espacements, rayons, typographie, densité | `css/styles.css`, `css/preferences.css` | Portée en tokens de design (Tailwind) |
| **Wording et ton** : titres, sous-titres, états vides (« Tout est sous contrôle ») | Pages et `docs/positionnement-produit.md` | Repris tels quels — résultat d'un travail de positionnement, pas de rédaction |
| **Scénario de démonstration à dates relatives** | `window.COCKPIT_DEMO_DATES` (V0.13.1) | Porté dans le script de peuplement de la base |
| **Seuils configurables** (relance devis, RDV non confirmé, relance client, trésorerie basse) | `js/settings-defaults.js` | Deviennent des colonnes de `settings` |

---

## 3. Porté / réécrit

Ce qui existe déjà sous une forme correcte et sera **transposé** avec un changement de technologie.

| Élément V0 | Devient en V1 | Nature du portage |
|---|---|---|
| `js/insights-engine.js` (515 lignes, fonction pure `compute(context)`) | `modules/insights/engine.ts` | **Portage quasi littéral** : la fonction est déjà pure, sans DOM, avec injection de la date de référence. Simplification au passage : le contexte devient de la donnée pure, les moteurs de calcul n'étant plus injectés mais importés |
| `tests/insights-engine.test.js` (346 lignes, cas déclenché / non déclenché / limite / absence de données) | `tests/unit/insights/*.test.ts` | **Portage des cas de test** : c'est le cahier de recette du moteur, il vaut plus que le code qu'il teste |
| `COCKPIT_DEVIS_CALC` (`computeLine`, `computeDevisTotals`) | `modules/quotes/calc.ts`, `lib/money/` | **Réécriture** : même séquence, arithmétique en centimes entiers |
| `COCKPIT_FACTURE_CALC` (`computePaiements`, `computeStatutAffiche`) | `modules/invoices/calc.ts`, `status.ts` | **Réécriture** : mêmes règles, statut dérivé de faits stockés |
| `COCKPIT_TRESORERIE_CALC` (`computeSnapshot`, projection) | `modules/cash/` | **Réécriture** avec agrégations SQL au lieu de parcours en mémoire |
| Gabarits d'impression (`devis-document.html`, `facture-document.html`) | `pdf/quote.tsx`, `pdf/invoice.tsx` | **Réécriture** en composants PDF ; la mise en page et les mentions servent de modèle |
| Pages de l'application | Composants React | **Réécriture**, avec le périmètre réduit du MVP |
| Jeu de données de démonstration | `prisma/seed.ts` | **Réécriture**, en conservant le scénario (facture en retard, devis en attente, RDV du jour, client à relancer) |

---

## 4. Abandonné

Sans regret, et sans tentative de sauvetage.

| Élément | Raison |
|---|---|
| Architecture en IIFE et singletons `window.COCKPIT_*` | Aucun typage, aucune frontière, non testable hors navigateur |
| Données métier en dur dans le HTML | Remplacées par la base de données |
| `localStorage` comme stockage de configuration ou de données | Remplacé par la table `settings` |
| Machinerie du centre de paramètres (catalogue, référentiels, consumers, interception de globales) | Le MVP conserve une poignée de réglages : cette infrastructure n'a plus d'objet |
| Tables statiques dupliquant les données JS (limite connue de la V0.13.1) | Disparaissent avec le rendu depuis la base |
| Fiche client enrichie : KPIs décoratifs, historique de communication typé, notes archivées | Hors périmètre MVP (CRM avancé) |
| Préparation commerciale détaillée du RDV (arguments, objections, prix cible) | Hors périmètre MVP |
| Page Analyses et ses cinq onglets | Repoussée en P2 par le cadrage MVP |
| Vues calendrier jour/semaine/mois | Remplacées au P0 par une liste d'activités |
| `Math.round(v * 100) / 100` sur flottants | Remplacé par des entiers de centimes |
| Numérotation `MAX + 1` | Remplacée par un compteur transactionnel |

---

## 5. Migration de données

**Aucune.** La V1 n'a ni utilisateur réel ni donnée de production ; la V0 ne persiste rien hors configuration locale de navigateur. Aucun script de migration, aucune reprise, aucune compatibilité ascendante à assurer.

C'est une chance qu'il faut mesurer : **cette décision est facile aujourd'hui et deviendrait très coûteuse après les premiers clients.** C'est un argument de plus pour la prendre maintenant.

---

## 6. Devenir du dépôt V0

1. La V0 est **figée** : branche fusionnée puis taguée, plus aucun développement fonctionnel.
2. Elle reste consultable comme **référence fonctionnelle et visuelle** pendant toute la construction de la V1 — le prototype tourne sans installation, ce qui en fait une maquette interactive de grande valeur pour arbitrer un détail d'écran.
3. Le dossier **`docs/` suit la V1** : `positionnement-produit.md`, `mvp-commercial.md`, `insights-engine.md` et `docs/v1/` sont les sources de vérité du nouveau projet, pas des archives.
4. **Décision ouverte** (`architecture.md` §28) : nouveau dépôt pour la V1 — recommandé, configuration d'outillage plus simple à la racine — ou dossier dédié dans le dépôt actuel. À trancher avant le lot 1.

---

## 7. Ce qui doit être vrai avant d'écrire la première ligne de V1

- [ ] L'architecture (`architecture.md`) est relue et validée par le chef de projet.
- [ ] Les décisions ouvertes bloquantes sont tranchées : emplacement du dépôt, hébergeur.
- [ ] Les trois prototypes de réduction de risque du lot 0 sont faits (PDF, numérotation concurrente, webhook Stripe).
- [ ] La V0 est taguée et figée.
- [ ] Le périmètre du lot 1 est écrit en tâches vérifiables.

Tant que ces points ne sont pas remplis, commencer la V1 revient à redécider les fondations en cours de route — ce que cette étape d'architecture avait précisément pour but d'éviter.
