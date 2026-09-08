# Lot 0 — Validation technique des fondations V1

> Rapport d'un **spike contrôlé** : du code minimal écrit pour éprouver les trois décisions d'architecture les plus risquées, avant d'engager la construction du MVP.
>
> Code : [`v1-spike/`](../../v1-spike/README.md) — **temporaire et supprimable**, aucune dépendance de la V0 envers lui.
> Architecture éprouvée : [`architecture.md`](architecture.md) · [`data-model.md`](data-model.md) · [`security.md`](security.md)

**Verdict global : les trois fondations tiennent. Le Lot 1 peut démarrer** — sous réserve des garde-fous du §9 et des points d'intégration cloud restant à confirmer (§7).

Le spike a par ailleurs mis au jour **quatre failles de conception** que la seule lecture de l'architecture n'aurait pas révélées (§8). C'était son objet.

---

## 1. Hypothèses testées

| # | Hypothèse d'architecture | Statut |
|---|---|---|
| H-A1 | Une extension Prisma peut injecter automatiquement le filtre tenant | **Confirmée, avec limites documentées** |
| H-A2 | La RLS PostgreSQL bloque ce que l'extension laisse passer | **Confirmée** |
| H-A3 | Le contexte tenant peut être transmis à PostgreSQL de façon fiable depuis Prisma | **Confirmée** (`set_config` transactionnel) |
| H-A4 | Un `organizationId` fourni par le navigateur ne peut pas ouvrir l'accès | **Confirmée, après correction** |
| H-B1 | Un compteur transactionnel garantit des numéros uniques en concurrence | **Confirmée** (50 émissions simultanées) |
| H-B2 | Un rollback ne laisse pas de trou dans la séquence | **Confirmée** |
| H-C1 | `@react-pdf/renderer` génère un PDF fiable sans Chromium | **Confirmée** |
| H-C2 | Un document émis reste immuable quand la donnée source change | **Confirmée** |
| H-M1 | Les montants peuvent être exacts sans bibliothèque décimale | **Confirmée — architecture simplifiée** |

## 2. Protocole

- **PostgreSQL 16.13** local, réel — ni simulacre, ni base en mémoire.
- **Trois rôles distincts** pour que la RLS soit éprouvée dans les conditions de production : propriétaire (DDL), applicatif (`NOBYPASSRLS`, non propriétaire), système (`BYPASSRLS`).
- **Prisma 6.19** avec extension client, transactions interactives.
- **60 tests automatisés** répartis en 4 suites, exécutés en série sur une base réelle réinitialisée avant chaque test.
- Chaque protection est testée **isolément** : on vérifie systématiquement ce qui se passe quand la couche du dessus est contournée (SQL brut, contexte forgé, `organizationId` injecté).

```
v1-spike ▸ 4 fichiers ▸ 60 tests ▸ 100 % au vert
  isolation.test.ts  26   numbering.test.ts   8
  documents.test.ts  12   money.test.ts      14
```

---

## 3. Spike A — Authentification et multi-tenancy

### 3.1 Chaîne validée

```
session utilisateur (simulée)
  → appartenances lues en base          ← autorise l'organisation
  → TenantContext marqué (type opaque)  ← impossible à fabriquer par mégarde
  → withTenant() : ouvre une transaction
      ├─ set_config('app.user_id',         …, local)   ┐ portée TRANSACTION
      ├─ set_config('app.organization_id', …, local)   ┘ annulée au COMMIT/ROLLBACK
      └─ client Prisma étendu (filtre injecté)
  → PostgreSQL : policies RLS (concordance d'organisation ET appartenance)
```

### 3.2 Transmission du contexte à PostgreSQL — mécanisme retenu

Trois mécanismes ont été considérés ; le choix n'est pas de confort :

| Mécanisme | Verdict | Raison |
|---|---|---|
| Claims JWT / `auth.uid()` | **Écarté** | Ne fonctionne qu'à travers PostgREST (client Supabase). Prisma ouvre une connexion PostgreSQL directe : aucun claim n'existe dans cette session. |
| `SET` de portée session | **Écarté — dangereux** | Avec un pool de connexions, la valeur survit à la requête et peut fuiter vers la requête suivante, potentiellement d'un autre tenant. |
| `set_config(…, is_local => true)` | **Retenu** | Portée transaction : annulée au COMMIT comme au ROLLBACK, donc impossible à faire fuiter entre deux requêtes. Paramétrable, donc sans risque d'injection — contrairement à `SET LOCAL x = '…'` qui imposerait une concaténation de chaîne. |

### 3.3 Résultats (26 tests)

| Scénario | Attendu | Obtenu |
|---|---|---|
| A lit ses clients | autorisé | ✅ 1 ligne |
| A lit le client de B par identifiant | refusé | ✅ `null` |
| A modifie son client | autorisé | ✅ |
| A modifie le client de B | refusé | ✅ exception, donnée de B intacte |
| `updateMany` de A | ne touche que A | ✅ 1 ligne, B intacte |
| A supprime son client | autorisé | ✅ |
| A supprime le client de B | refusé | ✅ exception |
| `deleteMany` de A | ne touche que A | ✅ B intacte |
| A crée un client chez lui | autorisé | ✅ |
| A crée un client chez B (via Prisma) | refusé | ✅ `TenantScopeViolationError` |
| A insère chez B **en SQL brut** | refusé | ✅ `row-level security policy` |
| Requête **sans aucun contexte** | rien | ✅ 0 ligne / écriture refusée |
| `SELECT` brut sans clause tenant | filtré | ✅ RLS seule : 1 ligne, celle de A |
| `UPDATE`/`DELETE` bruts sans clause tenant | filtrés | ✅ B intacte |
| `organizationId` de B forcé dans un `where` | refusé | ✅ erreur explicite |
| `organizationId` fabriqué côté navigateur | refusé | ✅ `ForbiddenOrganizationError` |
| Contexte **forgé** (user A + org B) | refusé | ✅ 0 ligne — *après correction, cf. §8.2* |
| Relation imbriquée (`include`) | filtrée | ✅ par la RLS, **pas** par l'extension |
| Symétrie A↔B | étanche | ✅ |

### 3.4 Limites de l'extension Prisma — mesurées, pas supposées

L'extension **réduit le risque d'oubli**, elle ne constitue pas une barrière de sécurité. Le spike a vérifié précisément où elle s'arrête :

| Cas | Extension | RLS | Conclusion |
|---|---|---|---|
| `findMany`, `findFirst`, `count`, `aggregate` | ✅ filtre injecté | ✅ | Couvert deux fois |
| `updateMany`, `deleteMany` | ✅ | ✅ | Couvert deux fois |
| `findUnique`, `update`, `delete` (clé unique) | ✅ possible grâce à `extendedWhereUnique` de Prisma ≥ 5 | ✅ | Couvert deux fois |
| `create`, `createMany`, `upsert` | ✅ tenant imposé | ✅ | Couvert deux fois |
| **Relations imbriquées** (`include`, écritures imbriquées) | ❌ **non intercepté** | ✅ | **RLS seule** |
| **Modèle hors périmètre** de l'extension | ❌ | ✅ | **RLS seule** |
| **SQL brut** (`$queryRaw`, `$executeRaw`) | ❌ **jamais intercepté** | ✅ | **RLS seule** |

> **Conséquence directe sur l'architecture** : trois cas d'usage parfaitement ordinaires ne sont protégés **que** par la RLS. Reporter son activation, comme le prévoyait l'ADR-06 initial, aurait laissé ces trois trous ouverts en production. **La RLS devient obligatoire dès le Lot 1** (§8.1).

---

## 4. Authentification — ce qui a été prouvé, et ce qui ne l'a pas été

Distinction stricte, conformément à la consigne de ne rien survendre :

| Élément | Statut | Détail |
|---|---|---|
| Résolution des appartenances en base | ✅ **Réellement exécuté** | Requête réelle, RLS active sur `memberships` |
| Autorisation de l'organisation demandée | ✅ **Réellement exécuté** | Un `organizationId` non couvert par une appartenance est rejeté |
| Construction du contexte serveur | ✅ **Réellement exécuté** | Type marqué, producteur unique |
| Isolation de bout en bout | ✅ **Réellement exécuté** | 26 tests sur PostgreSQL réel |
| **Supabase Auth** (inscription, connexion, mot de passe oublié, sessions, vérification d'e-mail) | ⚠️ **NON exécuté** | Exige un projet Supabase et des identifiants indisponibles dans cet environnement hors ligne |

Le spike **simule uniquement l'étape amont** (« voici l'utilisateur connecté ») et teste réellement tout ce qui suit. Le point de couture est un seul appel (`getSession()`), isolé dans `src/auth/session.ts` : le reste du code ne change pas quand l'authentification réelle est branchée.

**À confirmer en environnement connecté (Lot 1)** : flux d'inscription et de réinitialisation, durée et renouvellement de session, cookies `HttpOnly`/`Secure`/`SameSite`, vérification d'e-mail, correspondance entre l'identifiant Supabase et la clé primaire de `users`, région d'hébergement UE.

---

## 5. Spike B — Numérotation concurrente

**Algorithme retenu — une seule instruction atomique :**

```sql
INSERT INTO document_counters (organization_id, doc_type, year, last_value)
VALUES ($1, $2, $3, 1)
ON CONFLICT (organization_id, doc_type, year)
DO UPDATE SET last_value = document_counters.last_value + 1
RETURNING last_value
```

Exécutée **dans la transaction d'émission**. Le verrou de ligne PostgreSQL sérialise les demandeurs concurrents ; l'incrément appartient à la transaction.

| Test | Résultat |
|---|---|
| 5 allocations successives | ✅ 1, 2, 3, 4, 5 — compteur final 5 |
| **50 émissions simultanées** | ✅ **50 numéros distincts, séquence 1→50 sans trou, compteur final 50** |
| 30 insertions concurrentes de documents réels | ✅ 30 numéros uniques ; la contrainte `UNIQUE (organization_id, number)` n'a jamais été sollicitée |
| Séparation par organisation / type / exercice | ✅ trois compteurs indépendants repartent à 1 |
| Allocation visant une organisation étrangère | ✅ refusée par la RLS |
| **Rollback après allocation** | ✅ compteur revenu à sa valeur antérieure ; **le numéro est réattribué à l'émission suivante → aucun trou** |
| **Démonstration de l'approche V0 (`MAX+1`)** | ✅ **deux émissions concurrentes obtiennent le même numéro** |

Le dernier test mérite d'être souligné : il **reproduit expérimentalement le défaut de la V0** signalé au backlog. La course y est rendue déterministe par un délai ; en production elle est simplement moins probable, pas moins réelle.

**Format** : la valeur métier (`docType`, `year`, `sequence`) est stockée séparément de sa représentation (`FAC-2026-000001`). Aucune logique ne repose sur l'analyse de la chaîne — changer de format ne casse rien.

> ⚖️ **Point réglementaire non tranché ici** : le caractère continu exigé de la numérotation des factures, la conduite à tenir en cas d'annulation et les obligations d'archivage relèvent d'une validation comptable et juridique externe (déjà signalé dans `security.md` §9). Le spike valide une **propriété technique** — unicité et continuité — pas sa conformité légale.

---

## 6. Argent — convention validée et **simplifiée**

| Grandeur | Représentation | Exemple |
|---|---|---|
| Montant | entier de **centimes** | 1 234,56 € → `123456` |
| Quantité | entier de **millièmes** | 1,5 j → `1500` |
| Taux (TVA, remise) | entier de **points de base** | 20 % → `2000` |

**Résultat marquant : aucune bibliothèque décimale n'est nécessaire.** En exprimant les trois grandeurs en entiers, tous les calculs se ramènent à de l'arithmétique entière exacte (`BigInt` en interne). L'architecture prévoyait `decimal.js` : le spike montre qu'une dépendance peut être supprimée sans rien perdre en exactitude (§8.4).

Ordre d'arrondi conservé de la V0, arrondi au centime à chaque étape nommée :
`brut = round(qté × PU)` → `remise = round(brut × taux)` → `net = brut − remise` → `TVA = round(net × taux)` → `TTC = net + TVA`

| Test (14) | Résultat |
|---|---|
| `0.1 + 0.2 !== 0.3` en flottant | ✅ démontré |
| Même calcul en centimes | ✅ exact |
| **Dérive de l'arrondi V0** : `Math.round(4.475 * 100) / 100` | ✅ donne `4.47` au lieu de `4.48` — le calcul entier donne le résultat attendu |
| Quantité décimale (1,5 × 33,33 €) | ✅ 50,00 € |
| Remise appliquée avant TVA | ✅ |
| Taux 5,5 % / 10 % / 20 % sur un même document | ✅ récapitulatif par taux correct |
| Totaux = somme des lignes arrondies | ✅ et **différents** d'un recalcul global d'un centime — écart précisément évité |
| 100 lignes cumulées | ✅ aucune dérive |
| Conversion et formatage aux frontières | ✅ `1 234,56 €`, jamais reconverti |

---

## 7. Spike C — PDF, stockage, immutabilité

### 7.1 Génération — mesures réelles

| Mesure | Valeur |
|---|---|
| Chargement du module (contribution au démarrage à froid) | **268 ms** |
| Premier rendu | **141 ms** |
| Rendu chaud (médiane sur 10) | **24 ms** |
| Document de **120 lignes** | **404 ms**, 13 Ko |
| Empreinte mémoire du processus | **187 Mo RSS** / 53 Mo de tas |
| Poids de la dépendance | **2,6 Mo** |
| Chromium requis | **non** |

Français accentués, ligatures et symbole € rendus correctement avec les polices standard ; pagination (`Page n / N`) fonctionnelle sur document long.

**Lecture serverless** : 2,6 Mo de dépendance et ~270 ms de chargement de module tiennent très largement dans les limites usuelles d'une fonction serverless — là où un Chromium embarqué (plusieurs dizaines de Mo, démarrage à froid de plusieurs secondes) aurait été le principal facteur de risque. **`@react-pdf/renderer` est confirmé.**

⚠️ Mesures obtenues sous **Node 22 en conteneur Linux**, pas sur l'hébergeur cible. À reconfirmer lors du premier déploiement (§9).

### 7.2 Stockage et accès

Le métier ne connaît qu'un **port** (`DocumentStorage`) ; le spike en fournit un adaptateur système de fichiers réellement testé. L'adaptateur Supabase Storage implémentera la même interface.

| Test (12) | Résultat |
|---|---|
| Chemin scopé par organisation `organizations/{org}/documents/{id}.pdf` | ✅ |
| Empreinte SHA-256 enregistrée et vérifiable après relecture | ✅ |
| URL signée : restitue le document | ✅ |
| URL **expirée** | ✅ refusée |
| Signature **altérée** | ✅ refusée (comparaison à temps constant) |
| **B tente d'obtenir un document de A** | ✅ document introuvable dans son contexte → aucune URL signable ; et le chemin deviné seul ne donne rien |

> Le chemin n'est **pas** un mécanisme de sécurité : il rend le rangement lisible. L'autorisation est vérifiée en base **avant** toute signature. Le test le vérifie explicitement.

⚠️ **Non testé** : Supabase Storage réel (téléversement, URL signées du fournisseur, expiration côté serveur, politiques de bucket). À valider en Lot 1 en environnement connecté.

### 7.3 Immutabilité documentaire

Scénario complet : client créé → facture émise (numéro + snapshots figés + PDF stocké) → **le client change de nom et d'adresse** → vérification.

| Vérification | Résultat |
|---|---|
| Snapshot client du document | ✅ **inchangé** |
| Montants figés | ✅ inchangés |
| PDF stocké, comparé **bit à bit** (SHA-256) | ✅ **identique** |
| Fiche client vivante | ✅ bien mise à jour, elle |
| PDF régénéré **depuis le snapshot** | ✅ identique à l'original |

La stratégie de snapshot de la V0 est donc validée telle quelle : **une facture émise ne change pas parce que sa source change.**

---

## 8. Découvertes — quatre corrections d'architecture

Le spike a produit ce qu'on lui demandait : des problèmes trouvés maintenant plutôt qu'en production.

### 8.1 La RLS ne peut pas être reportée ⚠️ *décision modifiée*

**Constat.** L'extension Prisma n'intercepte ni les relations imbriquées, ni les modèles hors périmètre, ni le SQL brut (§3.4, mesuré). Ces trois cas sont ordinaires, pas exotiques.

**Décision.** L'ADR-06 disait « mécanisme applicatif en primaire, RLS en durcissement conditionnel avant la bêta ». **Révisé : la RLS est active dès le Lot 1, en même temps que la première table métier.** Elle n'est pas un durcissement, c'est la seule couche qui couvre les trois trous ci-dessus. Le spike démontre par ailleurs qu'elle coûte peu : deux `set_config` par transaction et des policies de trois lignes.

### 8.2 Une policy d'organisation ne suffit pas : il faut vérifier l'appartenance ⚠️ *nouveau*

**Constat.** Avec une policy `organization_id = app_current_org()`, un contexte **forgé en code** (`{ userId: A, organizationId: B }`) donnait accès aux données de B. La RLS **confinait** la requête à l'organisation annoncée, mais ne **vérifiait pas** que l'utilisateur y avait droit. La seule barrière était alors applicative — donc contournable par un simple oubli d'appel au résolveur.

**Correction, appliquée et testée.** Deux niveaux :

1. **En base** — la policy exige aussi une appartenance réelle :
   ```sql
   USING (organization_id = app_current_org() AND app_is_member(organization_id))
   ```
   La base cesse de faire confiance à la variable posée par l'application.
2. **Dans les types** — `TenantContext` est un type marqué, dont le seul producteur légitime est `resolveTenantContext()`, qui vérifie l'appartenance. Un contexte fabriqué à la main ne compile plus.

Trois tests verrouillent la correction (lecture, écriture, SQL brut sous contexte forgé → tous bloqués).

### 8.3 Un troisième rôle PostgreSQL est nécessaire ⚠️ *nouveau*

**Constat.** `FORCE ROW LEVEL SECURITY` — indispensable, sans quoi le propriétaire des tables échappe aux policies — bloque **aussi le propriétaire**. Or l'inscription doit créer une organisation *avant* qu'un contexte tenant puisse exister. Le spike a échoué à sa première exécution pour cette raison exacte.

**Correction.** Trois rôles, pas deux : propriétaire (DDL), applicatif (`NOBYPASSRLS`), et **système (`BYPASSRLS`)** réservé aux chemins sans contexte possible : inscription, webhooks de paiement, jeux de test. C'est la seule porte de sortie de la RLS, et elle doit rester confinée à `lib/db/system.ts` sous garde de lint et de test — comme l'architecture le prévoyait déjà, avec le rôle désormais précisé.

### 8.4 Aucune bibliothèque décimale n'est nécessaire ✅ *simplification*

**Constat.** Quantités en millièmes entiers + montants en centimes entiers + taux en points de base ⇒ arithmétique entière exacte de bout en bout.

**Décision.** `decimal.js`, prévu par l'architecture §8, est retiré. Une dépendance de moins dans le chemin le plus sensible du produit.

### 8.5 Correction mineure : échouer bruyamment plutôt qu'écraser silencieusement

L'extension écrasait sans rien dire un `organizationId` explicitement fourni par l'appelant. Sûr (aucune fuite), mais masquant un bug. Elle lève désormais `TenantScopeViolationError`.

---

## 9. Matrice de validation

| Fondation | Verdict | Commentaire |
|---|---|---|
| **PostgreSQL RLS** | ✅ **Validé** | Bloque SQL brut, relations imbriquées, contexte absent et contexte forgé. Testé sur PostgreSQL 16 réel. |
| **Multi-tenancy complet** | ✅ **Validé** | 26 tests, deux couches indépendantes, après les corrections §8.2 et §8.3. |
| **Prisma** | ✅ **Validé, limites documentées** | Extension efficace contre l'oubli ; ne couvre ni le SQL brut, ni les relations imbriquées, ni les modèles hors périmètre — d'où la RLS. |
| **Numérotation concurrente** | ✅ **Validé** | 50 émissions simultanées, aucun doublon, aucun trou, rollback correct. |
| **Convention argent** | ✅ **Validé et simplifié** | Exactitude prouvée, une dépendance supprimée. |
| **PDF** | ✅ **Validé localement** | Sans Chromium, 24 ms à chaud, 2,6 Mo. ⚠️ à reconfirmer sur l'hébergeur cible. |
| **Immutabilité documentaire** | ✅ **Validé** | Snapshot et PDF identiques bit à bit après modification de la source. |
| **Storage** | 🟡 **Partiel** | Port, chemins, URL signées, expiration, autorisation : validés sur adaptateur local. **Supabase Storage réel non testé.** |
| **Next.js + Supabase Auth** | 🟡 **Partiel** | Toute la chaîne *en aval* de la session est validée. **Supabase Auth et Next.js eux-mêmes ne sont pas exercés** dans ce spike (environnement hors ligne, pas d'application web). |

---

## 10. Ce qui reste à confirmer

| Sujet | Quand | Pourquoi ce n'était pas testable ici |
|---|---|---|
| Supabase Auth réel (inscription, réinitialisation, sessions, cookies) | Lot 1 | Exige un projet Supabase et des identifiants |
| Supabase Storage réel (téléversement, URL signées, politiques de bucket) | Lot 1 | Idem |
| Intégration **Next.js** : Server Actions, contexte tenant par requête, propagation de session | Lot 1 | Aucune application web n'a été montée — c'était hors périmètre du spike |
| Comportement du **pool de connexions** en conditions réelles (le `set_config` transactionnel est correct par construction, mais non éprouvé sous charge avec un pooler type PgBouncer en mode transaction) | Lot 1 | Nécessite l'infrastructure cible |
| Génération PDF sur **l'hébergeur cible** (limites mémoire et durée d'une fonction serverless) | Lot 1, premier déploiement | Mesuré ici sous Node 22 en conteneur Linux |
| Migrations Prisma versionnées (le spike utilise `db push`) | Lot 1 | Choix assumé de spike |
| Conformité **légale** de la numérotation, archivage, facturation électronique | Avant mise en production | Validation juridique externe (`security.md` §9) |

---

## 11. Recommandation

> ### Peut-on lancer le Lot 1 sur ces fondations ? **OUI.**

Les trois questions posées ont reçu une réponse démontrée par du code exécuté, pas par un raisonnement. Les deux failles sérieuses trouvées (§8.2, §8.3) ont été corrigées et sont verrouillées par des tests. Les points non validés (§10) sont des **intégrations à brancher**, pas des incertitudes de conception.

### Garde-fous que le Lot 1 doit impérativement conserver

1. **RLS active dès la première table métier**, avec `FORCE ROW LEVEL SECURITY` et une policy exigeant **concordance d'organisation *et* appartenance**. Jamais l'une sans l'autre.
2. **Trois rôles PostgreSQL** distincts. Le rôle `BYPASSRLS` reste confiné à un module unique, sous garde de lint et de test.
3. **`withTenant()` comme point d'accès unique** aux données métier. Aucun appel Prisma direct dans un service.
4. **`TenantContext` marqué**, produit uniquement après vérification d'appartenance. `organizationId` jamais lu depuis une entrée navigateur.
5. **`set_config(…, is_local => true)`** — jamais `SET` de portée session, qui fuiterait à travers le pool.
6. **Numéro alloué à l'émission**, dans la transaction, par `INSERT … ON CONFLICT DO UPDATE … RETURNING`. Jamais `MAX+1` ni `COUNT+1`.
7. **Argent en entiers** — centimes, millièmes, points de base. Aucun flottant dans le chemin de calcul. Totaux = somme des lignes stockées.
8. **Snapshots figés à l'émission**, à compléter en Lot 1 par le **trigger d'immutabilité** prévu par l'architecture — non implémenté dans ce spike.
9. **Les 60 tests du spike sont le noyau de la future CI** : isolation, numérotation et argent sont **bloquants**.

### Ce que le Lot 1 doit ajouter en priorité

Trigger d'immutabilité en base · migrations Prisma versionnées · adaptateur Supabase (Auth + Storage) · garde de schéma vérifiant qu'aucune table métier n'échappe à `organization_id` et à la RLS · garde de lint sur l'importation du client système.

---

## 12. Sort du spike

`v1-spike/` est **temporaire**. Il n'est pas la V1 et ne doit pas grandir : c'est une preuve, pas un socle. Le Lot 1 démarre un projet propre et **réimplémente** ces mécanismes dans l'arborescence cible (`architecture.md` §17), en s'appuyant sur ce répertoire comme référence exécutable. Une fois le Lot 1 opérationnel, `v1-spike/` peut être supprimé sans regret : ses conclusions vivent dans ce document.
