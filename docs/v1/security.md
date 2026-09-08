# Sécurité, RGPD et exploitation — V1

> Complète [`architecture.md`](architecture.md) et [`data-model.md`](data-model.md). Exigences **techniques** minimales d'un SaaS B2B français manipulant des données d'entreprise et des données personnelles de clients finaux.
>
> Ce document n'est pas un audit juridique. Les points nécessitant une validation externe sont signalés ⚖️.

---

## 1. Modèle de menace — ce que nous protégeons

Par ordre de gravité décroissante, pour ce produit précisément :

| Menace | Impact | Réponse principale |
|---|---|---|
| **Fuite entre organisations** | Un dirigeant voit les clients ou le chiffre d'affaires d'un concurrent. Incident majeur, perte de confiance irréversible, notification CNIL probable | Isolation structurelle + tests bloquants (§2) |
| **Compromission d'un compte** | Accès à toute la donnée commerciale d'une entreprise | Authentification déléguée, sessions, limitation de débit (§3) |
| **Altération d'un document légal** | Facture modifiée après émission : problème légal et fiscal | Immutabilité applicative **et** en base (§4) |
| **Perte de données** | Perte de la facturation d'une entreprise | Sauvegardes vérifiées (§7) |
| **Erreur de montant** | Facturation fausse chez un client réel | Entiers de centimes, tests (`architecture.md` §8) |
| **Exposition d'un document** | PDF de facture accessible sans authentification | Stockage privé, URL signées courtes (§5) |

---

## 2. Isolation multi-tenant

Le mécanisme complet est décrit dans `architecture.md` §6. Rappel des points non négociables :

1. `organization_id NOT NULL` sur **toute** table métier, unicités composites scopées.
2. `organizationId` **toujours dérivé de la session serveur** — jamais d'un paramètre d'URL, d'un champ de formulaire ou d'un en-tête. Une requête qui « demande » une organisation est refusée par construction, puisque le paramètre n'existe pas.
3. **Filtrage injecté automatiquement** par l'extension du client de base ; absence de contexte tenant = erreur, pas requête non filtrée.
4. Client de base non filtré isolé dans `lib/db/system.ts`, importation surveillée par règle de lint et par test.
5. **Identifiants UUID** : une URL devinée ne révèle rien, et même connue, elle reste filtrée.
6. **Tests d'isolation bloquants en CI** sur tous les modèles, plus une garde de schéma qui interdit d'ajouter une table métier non scopée.
7. **RLS PostgreSQL** : schéma conçu compatible dès le départ ; activation avant l'ouverture au-delà d'une bêta fermée, ou immédiatement si du SQL brut apparaît (`architecture.md` ADR-06).

**Ce qu'un développeur ne doit jamais faire**, et qui doit être refusé en revue : écrire une requête avec un `where` tenant à la main, exposer un identifiant d'organisation dans une URL ou un formulaire, importer le client de base brut hors des chemins autorisés, ajouter une table métier sans `organization_id`.

---

## 3. Authentification, sessions et abus

- **Authentification déléguée** (Supabase Auth) : ni hachage, ni jetons de réinitialisation, ni gestion de session écrits par nous (`architecture.md` §7).
- **Mot de passe** : politique du fournisseur, longueur minimale, refus des mots de passe massivement compromis si le fournisseur le propose.
- **Sessions** : cookies `HttpOnly`, `Secure`, `SameSite=Lax`, expiration et renouvellement gérés par le fournisseur. Déconnexion effective côté serveur.
- **Vérification d'e-mail** requise avant l'accès aux fonctions d'émission de documents.
- **Limitation de débit** : sur la connexion et la réinitialisation (protection anti-bourrage), sur l'envoi d'e-mails (anti-abus), sur les Server Actions d'écriture (garde-fou général). Mise en œuvre au niveau de l'hébergeur ou par une limitation applicative simple ; **pas de Redis** au MVP.
- **Autorisation** : session valide → appartenance à l'organisation → abonnement donnant accès. Point d'extension unique `assertCan()` déjà appelé aux endroits sensibles pour préparer un futur RBAC sans chasse aux oublis.
- **Suppression de compte** : accessible depuis l'interface (§6).

---

## 4. Intégrité des documents et de l'argent

- **Immutabilité après émission** : garantie deux fois, dans l'application **et** par un trigger de base (`data-model.md`). L'application peut avoir un bug ; la base, non.
- **Snapshots** : identité de l'émetteur et du client copiées à l'émission. Modifier une fiche client ne réécrit jamais l'histoire.
- **Numérotation** : compteur transactionnel verrouillé, unicité en base, allocation à l'émission — ni trou ni doublon (`architecture.md` §10).
- **Empreinte SHA-256** de chaque PDF stocké : permet de démontrer qu'un document n'a pas été altéré.
- **Traçabilité ciblée** : qui a émis, qui a annulé et pourquoi, quels paiements et quand, quels webhooks traités.
- **Transactions obligatoires** sur les quatre opérations sensibles (`architecture.md` §9.5).

---

## 5. Fichiers et documents

- Stockage **privé**, jamais public. Chemins scopés : `org/{organizationId}/{type}/{documentId}.pdf`.
- **Noms de fichiers** dérivés d'identifiants internes, jamais du nom du client (pas de donnée personnelle dans un chemin ni dans un journal).
- **Téléchargement par URL signée de courte durée** (quelques minutes), émise après vérification d'appartenance — un lien partagé par erreur expire de lui-même.
- **Téléversements** (logo, P1) : type MIME et taille contrôlés côté serveur, extension normalisée, jamais de fichier exécutable.
- Suppression d'un fichier : suppression du stockage **et** de sa ligne de métadonnées, dans la même opération.

---

## 6. RGPD — exigences techniques minimales

Le produit traite des **données personnelles de tiers** : les clients finaux de nos utilisateurs. Nos utilisateurs sont responsables de traitement, nous sommes sous-traitant — ce qui impose des obligations techniques concrètes.

| Exigence | Mise en œuvre |
|---|---|
| **Chiffrement en transit** | HTTPS strict partout, HSTS, aucune ressource en clair |
| **Chiffrement au repos** | Assuré par les fournisseurs de base et de stockage |
| **Minimisation** | On ne collecte que ce dont le produit a besoin : pas de champ « au cas où ». Le MVP a déjà supprimé l'historique de communication typé de la V0 |
| **Localisation** | Base, stockage et authentification en **région UE** |
| **Droit d'accès / portabilité** | **Export de toutes les données d'une organisation** (JSON + PDF des documents), déclenchable depuis l'interface |
| **Droit à l'effacement** | Suppression de compte et d'organisation avec effacement des données associées ⚖️ |
| **Conservation** | Politique écrite, appliquée techniquement ; à articuler avec l'obligation légale de conservation des factures ⚖️ |
| **Journalisation** | Journaux **sans donnée personnelle ni montant** : identifiants techniques et corrélation seulement. Sentry configuré pour ne pas capturer les corps de requêtes |
| **Sous-traitants** | Liste tenue à jour (hébergeur, base, e-mail, paiement, supervision) pour la documentation contractuelle ⚖️ |
| **Violation de données** | Procédure écrite de détection et de notification ⚖️ |

> ⚖️ **Tension à arbitrer avec un juriste avant la bêta payante** : le droit à l'effacement et l'obligation de conservation des factures se contredisent partiellement. Piste technique privilégiée : anonymiser les données personnelles rattachées tout en conservant les documents comptables et leurs snapshots pendant la durée légale. La durée exacte et la légitimité de cette approche doivent être validées, pas déduites de ce document.

---

## 7. Sauvegardes et résilience

- **Base** : sauvegarde automatique quotidienne, chiffrée, rétention ≥ 30 jours, récupération à un instant donné si le fournisseur la propose.
- **Restauration testée au moins une fois avant la bêta payante**, avec procédure écrite — critère du « Done » du MVP. Une sauvegarde jamais restaurée n'est pas une sauvegarde.
- **Documents** : réplication du fournisseur de stockage ; second filet réel, les PDF émis sont regénérables à l'identique depuis les snapshots en base.
- **Perte maximale acceptée** : une journée de données ; **indisponibilité tolérée** : quelques heures. À écrire dans les conditions de service plutôt qu'à promettre implicitement.
- **Secrets** : stockés chez l'hébergeur, jamais dans le dépôt, rotation possible sans redéploiement du code.

---

## 8. Application web — durcissement courant

- **Validation systématique côté serveur** (Zod) sur toute entrée, y compris celles déjà validées côté client. La validation client est un confort d'usage, pas une protection.
- **XSS** : rendu React échappé par défaut ; `dangerouslySetInnerHTML` interdit sans revue explicite ; en-tête `Content-Security-Policy`.
- **CSRF** : les Server Actions de Next.js protègent par origine ; les route handlers d'écriture vérifient l'origine et, pour les webhooks, la **signature du fournisseur**.
- **En-têtes** : HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`.
- **Injection SQL** : requêtes paramétrées via l'ORM ; **tout SQL brut exige une revue** et déclenche la question de l'activation de RLS.
- **Secrets côté serveur uniquement** : aucune clé de service dans un composant client. Seules les variables explicitement publiques sont exposées.
- **Dépendances** : audit automatisé en CI, mises à jour de sécurité appliquées rapidement, nombre de dépendances gardé volontairement bas.
- **Erreurs** : message générique et identifiant de corrélation à l'utilisateur ; détail technique uniquement dans les journaux serveur.

---

## 9. Ce qui reste à valider hors du dépôt ⚖️

| Sujet | À valider par |
|---|---|
| Durée légale de conservation des factures et modalités d'archivage à valeur probante | Expert-comptable / juriste |
| Articulation entre effacement RGPD et conservation comptable | Juriste |
| Calendrier, périmètre et formats de la facturation électronique applicables à la cible | Expert-comptable / prestataire agréé |
| Mentions légales obligatoires selon le régime de TVA de l'utilisateur | Expert-comptable |
| Contrat de sous-traitance RGPD, registre des traitements, politique de confidentialité | Juriste |
| Exigence éventuelle d'hébergement souverain selon les clients visés | Chef de projet + juriste |

Aucun de ces points n'est tranché dans ce dépôt, et aucun ne doit l'être par déduction.
