# Modèle de données V1 — Cockpit Entrepreneur

> Complète [`architecture.md`](architecture.md). Périmètre issu de `docs/mvp-commercial.md` — **le modèle part du MVP, pas des structures de la V0**, dont une partie était démonstrative (KPIs par client, historique de communication typé, notes archivées) et n'est pas reprise.
>
> Conception, pas migrations : les types indiqués sont des intentions, le SQL définitif sera produit au lot 1.

## Conventions applicables à toutes les tables

| Convention | Règle |
|---|---|
| **Clé primaire** | `id UUID` (généré côté base). Aucun identifiant séquentiel devinable dans les URL. |
| **Tenant** | Toute table métier porte `organization_id UUID NOT NULL REFERENCES organizations(id)`, **indexé**. Sans exception — une table métier sans cette colonne fait échouer la CI (`architecture.md` §6.2). |
| **Unicité** | Toujours composite et scopée : `UNIQUE (organization_id, …)`. Jamais d'unicité globale sur une valeur métier. |
| **Argent** | Entiers de centimes, colonnes suffixées `_cents`. Jamais de flottant (`architecture.md` §8). |
| **Taux** | Points de base entiers (`2000` = 20,00 %). |
| **Quantités** | `NUMERIC(12,3)`. |
| **Dates** | `TIMESTAMPTZ` pour les instants (`created_at`, `issued_at`), `DATE` pour les dates métier sans heure (`due_date`, `movement_date`). |
| **Traçabilité** | `created_at`, `updated_at` partout. `created_by` sur les objets à valeur légale ou financière. |
| **Suppression** | Suppression réelle pour les objets sans valeur légale (client, tâche, mouvement) ; **jamais** de suppression d'un document émis — seulement une annulation tracée. |

---

## Vue d'ensemble

```
users ──< memberships >── organizations ──── settings (1-1)
                               │        └──── subscriptions (1-1)
                               │
        ┌──────────────────────┼───────────────────┬──────────────┐
        │                      │                   │              │
     clients             cash_movements     document_counters   products
        │                                                       (P1)
   ┌────┼──────────┬─────────────┐
   │    │          │             │
activities      quotes ──1:1──> invoices ──< payments
(rdv/tâches)      │                │
                  │                ├──< invoice_lines
                  └──< quote_lines └──> documents (PDF)
                                        └──> einvoice_transmissions (P1)
```

---

## Identité et organisation

### `users`
> ⚑ **Reportée au Lot 1** (`docs/v1/lot-1-socle.md`, ADR-15) : `Membership.userId` porte directement l'UUID Supabase Auth, sans table miroir. Réversible — cette table pourra être ajoutée dès qu'un champ propre à l'utilisateur (nom, préférences) sera nécessaire, sans rien casser. Description ci-dessous conservée comme cible si/quand elle est réintroduite.

Personne physique disposant d'un accès. L'authentification est déléguée (Supabase Auth) : cette table **miroite** l'utilisateur d'authentification et porte ce qui nous appartient.

| Champ | Type | Notes |
|---|---|---|
| `id` | UUID PK | **Identique à l'identifiant du fournisseur d'authentification** |
| `email` | text | miroir, pour l'affichage et les envois |
| `first_name`, `last_name` | text | |
| `created_at`, `updated_at` | timestamptz | |

*Intégrité* : créé par upsert à la première connexion. Aucun mot de passe n'est stocké ici — jamais.

### `organizations`
**Le tenant.** Une organisation = une entreprise cliente = une entité légale (multi-entités hors périmètre, `docs/mvp-commercial.md`).

| Champ | Type | Notes |
|---|---|---|
| `id` | UUID PK | Référencé par toute donnée métier |
| `name` | text | nom d'usage |
| `legal_name` | text | raison sociale, reprise sur les documents |
| `siren`, `siret` | text | identifiants légaux |
| `vat_number` | text | TVA intracommunautaire (nullable : franchise en base) |
| `vat_exempt` | boolean | franchise en base → mentions et TVA à 0 |
| `address_*` | text | adresse structurée (rue, code postal, ville, pays) |
| `email`, `phone`, `website` | text | |
| `iban`, `bic`, `bank_name` | text | pour les mentions de règlement |
| `logo_document_id` | UUID FK | nullable (P1) |
| `created_at`, `updated_at` | | |

*Intégrité* : `legal_name`, `siret` et l'adresse doivent être renseignés **avant** toute émission de facture — vérifié à l'émission avec un message explicite, plutôt qu'imposé à l'inscription.

### `memberships`
Lien utilisateur ↔ organisation. Existe dès le premier jour bien que l'interface MVP n'en crée qu'un par utilisateur (`architecture.md` §6.3).

| Champ | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `organization_id` | UUID FK → organizations | |
| `role` | enum | `owner` uniquement au MVP ; le champ existe pour un RBAC ultérieur |
| `created_at` | | |

*Intégrité* : `UNIQUE (user_id, organization_id)`. Une organisation doit conserver au moins un `owner`.

### `settings`
Configuration par organisation — **réduite au strict nécessaire du MVP** : ce que la V0 étalait sur 14 sections tient ici en un enregistrement.

| Champ | Type | Notes |
|---|---|---|
| `organization_id` | UUID PK/FK | 1-1 avec l'organisation |
| `revenue_goal_cents`, `collection_goal_cents`, `cash_goal_cents` | int | objectifs du Dashboard |
| `cash_horizon_days` | int | horizon de projection (défaut 30) |
| `overdue_invoice_alert_enabled` | boolean | |
| `quote_no_reply_days` | int | seuil de relance de devis (défaut 7) |
| `unconfirmed_appointment_days` | int | seuil de RDV non confirmé (défaut 2) |
| `client_follow_up_days` | int | seuil de relance client (défaut 7) |
| `low_cash_threshold_cents`, `heavy_charge_threshold_cents` | int | seuils de trésorerie |
| `quote_prefix`, `invoice_prefix`, `number_includes_year` | text/bool | format de numérotation |
| `default_payment_days`, `default_vat_rate`, `quote_validity_days` | int | valeurs par défaut des documents |
| `legal_notice`, `footer_text` | text | mentions reprises sur les documents |

*Intégrité* : créé avec valeurs par défaut à la création de l'organisation. **Ces seuils alimentent directement le moteur d'insights** — ce sont les mêmes que ceux de la V0 (`docs/insights-engine.md`). Le format de numérotation ne peut plus changer une fois un document émis sur l'exercice (`architecture.md` §10).

### `subscriptions`
Miroir local de l'état Stripe ; **c'est cette table, pas un appel à Stripe, qui conditionne l'accès**.

| Champ | Type | Notes |
|---|---|---|
| `organization_id` | UUID PK/FK | |
| `stripe_customer_id`, `stripe_subscription_id` | text | |
| `plan` | text | une seule offre au départ |
| `status` | enum | `trialing \| active \| past_due \| canceled` |
| `current_period_end` | timestamptz | |
| `trial_ends_at` | timestamptz | nullable |

### `stripe_events`
Idempotence des webhooks — sans elle, un rejeu Stripe corrompt l'état d'accès.

| Champ | Type |
|---|---|
| `event_id` | text **PK** (identifiant Stripe) |
| `type`, `processed_at` | text, timestamptz |

---

## Domaine commercial

### `clients`
Volontairement **plus pauvre que la fiche V0** : le CRM avancé est hors MVP.

> ⚑ **Lot 2** (`docs/v1/lot-2-clients-dashboard.md`, ADR-16) : le statut implémenté est `prospect | active | to_follow_up | inactive | loyal` — **sans `litige`**, absent de la V0 et sans utilité identifiée pour le Dashboard actuel (ajoutable plus tard si un besoin réel apparaît). L'archivage (`archived_at`) est un champ **séparé** du statut CRM, pas une valeur de `status` : un client peut être "fidèle" et archivé. `address_*`, `siret`, `vat_number` ne sont pas encore implémentés (nécessaires à la facturation, pas au Lot 2).

| Champ | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `organization_id` | UUID FK | |
| `name` | text | personne ou société |
| `company_name` | text | nullable |
| `email`, `phone` | text | |
| `address_*` | text | nécessaire à la facturation |
| `siret`, `vat_number` | text | nullable — **captés dès le P0** pour la facturation électronique (`architecture.md` §13.2) |
| `status` | enum | `prospect \| actif \| a_relancer \| inactif \| fidele \| litige` — **consommé par le moteur d'insights** |
| `last_contact_at` | date | **consommé par la règle « client fidèle sans contact récent »** |
| `notes` | text | zone libre simple ; pas d'historique typé, pas de notes archivées |
| `created_at`, `updated_at` | | |

*Intégrité* : suppression bloquée s'il existe un document émis rattaché ; le client est alors archivé (`status = inactif`). Les documents émis ne dépendent de toute façon plus de cette ligne (snapshots).

### `activities`
Rendez-vous **et** tâches dans une seule table, discriminée par `kind` : les deux alimentent la même lecture (« mes priorités du jour »), partagent les mêmes champs utiles et ne justifient pas deux modèles.

> ⚑ **Lot 2** (ADR-16) : implémenté pour l'instant comme un modèle `Task` **autonome**, pas cette table `activities` fusionnée. Le Lot 2 exclut explicitement l'agenda/calendrier (pas de `scheduled_at`/`duration_minutes`/`location`/RDV) : les ajouter aurait été de la fausse fonctionnalité. `Task` porte uniquement `id, organizationId, clientId?, title, dueDate, completedAt, priority, createdAt, updatedAt`. Quand l'agenda sera construit, `activities` remplacera `Task` ou `Task` y sera fusionné — décision reportée, pas perdue. Voir `docs/v1/lot-2-clients-dashboard.md`.

| Champ | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `organization_id` | UUID FK | |
| `kind` | enum | `appointment \| task` |
| `client_id` | UUID FK | nullable (une tâche peut être sans client) |
| `title` | text | |
| `scheduled_at` | timestamptz | RDV : date et heure ; tâche : échéance, nullable |
| `duration_minutes` | int | RDV seulement |
| `location` | text | RDV seulement |
| `status` | enum | RDV : `prevu \| confirme \| reporte \| realise \| annule \| sans_suite` — tâche : `a_faire \| terminee` |
| `priority` | enum | `haute \| moyenne \| basse` (tâches) |
| `opportunity_level` | enum | `faible \| moyen \| fort` — nullable, **consommé par la règle « RDV à fort potentiel »** |
| `potential_amount_cents` | int | nullable, idem |
| `notes` | text | |

*Intégrité* : index `(organization_id, scheduled_at)` — requête du Dashboard « aujourd'hui ». La préparation commerciale détaillée de la V0 (arguments, objections, prix cible) n'est **pas** reprise (P2).

### `products` — P1
Catalogue de prestations réutilisables. Hors P0 : les lignes de devis sont libres au lancement.

| Champ | Type | Notes |
|---|---|---|
| `id`, `organization_id` | UUID | |
| `label`, `description` | text | |
| `unit_price_cents` | int | |
| `vat_rate_bp` | int | |
| `kind` | enum | `service \| produit` |
| `active` | boolean | |

*Intégrité* : **jamais référencé par clé étrangère depuis une ligne de document** — il ne sert qu'à pré-remplir. Modifier un tarif ne doit toucher aucun document existant.

---

## Devis

### `quotes`

> ⚑ **Implémenté au Lot 3** (`docs/v1/lot-3-devis.md`) avec deux écarts mineurs : pas de `payment_terms` séparé (fondu dans `notes`, pas de besoin identifié pour un champ dédié) ; pas de `converted_invoice_id` (le Lot 4, factures, l'ajoutera). Statuts en anglais dans le code (`draft/sent/accepted/rejected/expired`), mêmes transitions.

| Champ | Type | Notes |
|---|---|---|
| `id`, `organization_id` | UUID | |
| `client_id` | UUID FK | |
| `number` | text | **nullable tant que brouillon** ; alloué à l'envoi |
| `status` | enum | `brouillon \| envoye \| accepte \| refuse \| expire` |
| `issued_at` | timestamptz | date d'envoi, nullable |
| `valid_until` | date | |
| `client_snapshot`, `seller_snapshot` | jsonb | **figés à l'envoi** |
| `payment_terms`, `notes` | text | |
| `total_ht_cents`, `total_vat_cents`, `total_ttc_cents` | int | **somme des lignes stockées**, jamais recalculée par formule |
| `vat_breakdown` | jsonb | récapitulatif par taux |
| `converted_invoice_id` | UUID FK | nullable |

*Intégrité* : `UNIQUE (organization_id, number)` · `UNIQUE (converted_invoice_id)` → **un devis n'est transformable qu'une fois** · modification interdite après acceptation ou transformation.

### `quote_lines`

> ⚑ **Lot 3** (ADR-17) : `quantity` implémenté en `Int` (millièmes entiers, 1,5 → 1500) plutôt qu'en `Decimal(12,3)` — reste dans l'arithmétique entière (BigInt) validée au Lot 0, évite le type Prisma `Decimal`. `organization_id` dénormalisé (absent ci-dessous) pour porter la même policy RLS simple que les autres tables métier.

| Champ | Type | Notes |
|---|---|---|
| `id`, `quote_id` | UUID | |
| `position` | int | ordre d'affichage |
| `label`, `description` | text | **copiés**, jamais une référence vivante au catalogue |
| `quantity` | **Int (millièmes)**, pas `numeric(12,3)` — voir note ci-dessus | |
| `unit_price_cents` | int | |
| `vat_rate_bp` | int | |
| `discount_bp` | int | remise en points de base |
| `net_ht_cents`, `vat_cents`, `total_ttc_cents` | int | **calculés et stockés** selon la séquence d'arrondi de `architecture.md` §8 |

---

## Factures et paiements

### `invoices`

| Champ | Type | Notes |
|---|---|---|
| `id`, `organization_id` | UUID | |
| `client_id` | UUID FK | référence de navigation ; **les données du document viennent du snapshot** |
| `quote_id` | UUID FK | nullable, origine |
| `number` | text | **nullable tant que brouillon**, alloué à l'émission (`architecture.md` §10) |
| `issued_at` | timestamptz | nullable — **le fait qui distingue un brouillon d'une facture** |
| `issued_by` | UUID FK → users | |
| `due_date` | date | |
| `cancelled_at`, `cancelled_by`, `cancellation_reason` | | annulation tracée, jamais de suppression |
| `client_snapshot`, `seller_snapshot` | jsonb | **figés à l'émission** — identité, adresse, SIRET, TVA |
| `legal_mentions`, `payment_terms` | text | figés à l'émission |
| `total_ht_cents`, `total_vat_cents`, `total_ttc_cents` | int | somme des lignes |
| `vat_breakdown` | jsonb | par taux — obligation de présentation |
| `amount_paid_cents` | int | **agrégat maintenu dans la transaction de paiement** |
| `pdf_document_id` | UUID FK | |

*Intégrité, la plus stricte du modèle* :

- `UNIQUE (organization_id, number)` ;
- `number IS NOT NULL` dès lors que `issued_at IS NOT NULL` (contrainte `CHECK`) ;
- **trigger interdisant toute mise à jour** d'une facture émise, hors `amount_paid_cents`, `cancelled_*` et `pdf_document_id` — un bug applicatif ne doit pas pouvoir altérer un document légal ;
- suppression autorisée **uniquement** à l'état brouillon ;
- **le statut affiché n'est pas une colonne** : il est dérivé (`architecture.md` §9.1).

### `invoice_lines`
Structure identique à `quote_lines`, rattachée à `invoice_id`, avec les mêmes règles de copie et de calcul. Immuables après émission (même trigger).

### `payments`

| Champ | Type | Notes |
|---|---|---|
| `id`, `organization_id` | UUID | |
| `invoice_id` | UUID FK | |
| `amount_cents` | int | > 0 |
| `paid_at` | date | |
| `method` | enum | `virement \| carte \| cheque \| especes \| prelevement` |
| `reference`, `notes` | text | |

*Intégrité* : `CHECK (amount_cents > 0)` · somme des paiements ≤ `total_ttc_cents` (règle métier, message explicite) · toute insertion met à jour `amount_paid_cents` **dans la même transaction** · paiement interdit sur une facture non émise ou annulée.

---

## Trésorerie

### `cash_movements`
Trésorerie **opérationnelle et déclarative** — pas de comptabilité (`architecture.md` §15).

| Champ | Type | Notes |
|---|---|---|
| `id`, `organization_id` | UUID | |
| `direction` | enum | `encaissement \| decaissement` |
| `label` | text | |
| `category` | enum | `loyer \| fournisseur \| abonnement \| salaires \| impots \| autre` |
| `amount_cents` | int | > 0, le sens est porté par `direction` |
| `movement_date` | date | |
| `status` | enum | `prevu \| realise` |
| `notes` | text | |

*Intégrité* : index `(organization_id, movement_date, status)`. **Les encaissements clients ne sont pas saisis ici** : ils proviennent de `payments` — aucune double saisie, aucun double comptage. Le solde d'ouverture est un champ de `settings` ou un mouvement initial daté ; à trancher au lot 5.

---

## Documents et transmission

### `documents`

| Champ | Type | Notes |
|---|---|---|
| `id`, `organization_id` | UUID | |
| `kind` | enum | `quote_pdf \| invoice_pdf \| logo` |
| `storage_path` | text | `org/{organizationId}/…` |
| `filename`, `mime_type`, `size_bytes` | | |
| `sha256` | text | **preuve de non-altération** |
| `generated_at` | timestamptz | |
| `superseded_by` | UUID FK | nullable — régénération exceptionnelle tracée, jamais d'écrasement silencieux |

*Intégrité* : aucun accès public au stockage ; téléchargement par URL signée de courte durée après vérification d'appartenance. Un document survit à la suppression du client.

### `einvoice_transmissions` — structure P0, usage P1

| Champ | Type | Notes |
|---|---|---|
| `id`, `organization_id` | UUID | |
| `invoice_id` | UUID FK | |
| `provider` | text | pas d'enum : ne pas figer un fournisseur |
| `status` | enum | `pending \| sent \| accepted \| rejected \| error` |
| `provider_ref` | text | |
| `payload_hash` | text | |
| `last_error` | text | |
| `sent_at`, `updated_at` | | |

*Intégrité* : la table existe dès le P0 pour que la frontière soit réelle ; elle reste vide tant que l'intégration n'est pas branchée.

---

## `document_counters`
Cœur de la numérotation fiable (`architecture.md` §10).

| Champ | Type |
|---|---|
| `organization_id` | UUID, PK composite |
| `doc_type` | enum `quote \| invoice`, PK composite |
| `year` | int, PK composite |
| `last_value` | int |

*Intégrité* : incrémenté **exclusivement** par `UPDATE … SET last_value = last_value + 1 … RETURNING`, dans la transaction d'émission. Aucune lecture-puis-écriture applicative, aucun `MAX+1`, aucune séquence Postgres.

---

## Entités volontairement absentes

| Entité | Pourquoi |
|---|---|
| `insights` | Recalculés à la demande, jamais persistés (`architecture.md` §11) |
| `opportunities` | Le potentiel commercial est un attribut d'`activities` — pas de pipeline CRM séparé |
| `roles` / `permissions` | RBAC hors périmètre ; `memberships.role` suffit à préparer |
| `audit_log` générique | Traçabilité ciblée sur les objets sensibles (émission, annulation, paiements, webhooks) |
| `client_interactions` | Historique de communication typé de la V0 : démonstratif, hors MVP |
| `attachments` | Pièces jointes libres : P1 |
| `notifications` | Aucune notification in-app au MVP |

---

## Index à créer dès la première migration

Ils ne sont pas une optimisation tardive : ce sont les requêtes du Dashboard, qui est le point d'entrée du produit.

```
invoices        (organization_id, issued_at)
invoices        (organization_id, due_date) WHERE issued_at IS NOT NULL AND cancelled_at IS NULL
invoices        (organization_id, client_id)
quotes          (organization_id, status, issued_at)
activities      (organization_id, scheduled_at)
activities      (organization_id, kind, status)
payments        (organization_id, paid_at)
payments        (invoice_id)
cash_movements  (organization_id, movement_date, status)
clients         (organization_id, status)
```
