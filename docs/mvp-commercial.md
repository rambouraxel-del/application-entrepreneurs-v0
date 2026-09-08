# MVP commercial — Cockpit Entrepreneur

> Source de vérité du périmètre MVP, au même niveau que `docs/positionnement-produit.md` (vision) et `docs/insights-engine.md` (moteur décisionnel). Ce document définit ce que la première version réellement commercialisable doit contenir — pas comment la construire techniquement.

**Statut du document** : cadrage produit, rédigé à partir de l'état réel du dépôt (V0.13.1). **Aucun test utilisateur n'a encore été conduit.** Chaque affirmation de ce document est explicitement typée :

- 🔍 **Fait observé** — constaté dans le code du prototype.
- 🎯 **Choix produit** — décision prise faute de données utilisateur, en cherchant la solution la plus simple et la plus réversible.
- ❓ **Hypothèse à valider** — reprise dans le registre en fin de document.

---

## 1. Vision du MVP

Le MVP n'est pas une V0 « avec un vrai backend ». C'est le plus petit produit capable de tenir sa promesse — *« en 30 secondes, savoir où en est son entreprise et ce qu'il faut faire aujourd'hui »* — avec des données réelles et persistantes, pour un indépendant ou une TPE de services (1 à 10 personnes) qui accepte de payer pour ça. 🎯 Le Dashboard décisionnel (`docs/insights-engine.md`) est le produit ; les modules Clients, Devis, Factures, Trésorerie ne sont des écrans du MVP que dans la mesure où ils nourrissent ce Dashboard ou sont indispensables pour facturer légalement en France.

---

## 2. Étape 0 — Audit du produit existant

### 2.1 Cartographie des capacités actuelles

| Domaine | Rôle actuel | Valeur pour le cockpit | Maturité | Nécessaire au MVP |
|---|---|---|---|---|
| **Dashboard décisionnel** | 5 niveaux (situation, attention, priorités, opportunités, performance), moteur d'insights déterministe (`js/insights-engine.js`) 🔍 | Cœur du produit | Fonctionnel sur données en mémoire ; testé (`tests/insights-engine.test.js`) 🔍 | **P0**, essentiel |
| **Clients** | Fiche très riche : KPIs par client, info commerciale détaillée, notes + archive, historique de communication typé, RDV et documents « liés » (recopiés à la main, pas de vraie relation) 🔍 | Base de tout le parcours | Démonstration soignée, au-delà du nécessaire ; pas de persistance | **P0 réduit** (voir §4) |
| **Agenda / RDV** | Vues Jour/Semaine/Mois/Liste complètes, fiche RDV avec préparation commerciale détaillée (arguments, objections, prix cible), champs `opportunite`/`montantPotentiel` déjà consommés par le moteur d'insights 🔍 | Alimente priorités du jour + opportunités | Très développé visuellement, pas persistant | **P0 réduit** (voir §4) |
| **Produits / Services** | Catalogue avec types/statuts, utilisé en autocomplétion des lignes de devis/facture (confirmé dans le code) 🔍 | Accélère la saisie | Fonctionnel mais optionnel : les lignes de devis sont libres, pas liées par ID au catalogue | **P1** |
| **Devis** | Création, versions multiples par devis, lignes avec TVA/remise, statuts, transformation en facture, brouillon lié à un RDV 🔍 | Déclenche la facturation | Fonctionnel en mémoire | **P0 réduit** |
| **Factures** | Statut affiché calculé (brouillon/émise/payée/partiellement payée/en retard), échéance, paiements, snapshots figés à l'émission 🔍 | Cœur d'« Agir » + alimente trésorerie/alertes | Fonctionnel, numérotation **indicative** seulement 🔍 | **P0 réduit** |
| **Paiements / encaissements** | Saisie manuelle par facture (date, montant, mode), calcul du reste à payer | Le cockpit doit savoir ce qui est encaissé | Fonctionnel, manuel, pas de rapprochement bancaire | **P0**, tel quel |
| **Trésorerie** | Mouvements prévus/réalisés (charges), solde estimé, projection sur horizon configurable, alertes seuils | Alimente KPI « Trésorerie disponible » et alertes basses | Fonctionnel, ce n'est **pas** une comptabilité (aucune écriture comptable, aucun rapprochement) 🔍 | **P0 réduit** |
| **Analyses** | Page séparée, 5 onglets, graphiques et classements recoupant largement le Dashboard | Redondante avec le Dashboard depuis la V0.12.1 (déjà repositionnée comme « détail ») 🔍 | Fonctionnelle mais lourde | **P2 / repoussée** |
| **Tâches** | Liste simple titre/priorité/statut, en mémoire de page 🔍 | Alimente les priorités du jour | Minimal, suffisant | **P0**, tel quel |
| **Alertes / insights** | Moteur unique déterministe V0.13, séparé du rendu, testé | Cœur du produit | Le meilleur atout technique actuel pour la V1 (voir §9) | **P0** |
| **Paramètres** | Centre très complet : 14 sections, dont plusieurs déjà marquées « V1 » dans le catalogue lui-même (langue, fuseaux, formats, champs personnalisés, notifications externes…) 🔍 | Nécessaire pour les seuils d'alertes et les infos légales | Sur-dimensionné pour un MVP | **P0 très réduit** (voir §4) |
| **Documents (PDF)** | Devis/factures imprimables, mentions légales, snapshot immuable à l'émission 🔍 | Obligatoire pour facturer | Fonctionnel côté rendu, pas de génération serveur ni de stockage | **P0 réduit** |
| **Compte / authentification** | Entièrement simulé : pas de mot de passe, pas de session, un profil fictif unique 🔍 (section « Compte et sécurité » des paramètres explicitement marquée V1 dans le code) | Condition de la commercialisation | Inexistant | **P0**, à construire |

L'essentiel de la richesse actuelle (historique de communication typé, notes archivées, préparation commerciale détaillée du RDV, 14 sections de paramètres) est **démonstratif** : elle a servi à prouver que le produit était utilisable, pas à définir ce qui est indispensable pour vendre. C'est le principal gisement de simplification du MVP.

### 2.2 Ce qui est réellement fonctionnel vs simulé

- **Réellement fonctionnel** (calculs corrects, testés ou vérifiés visuellement) : statuts devis/factures, moteur d'insights, calcul de trésorerie prévisionnelle, paiement partiel/reste à payer, catalogue produits en autocomplétion.
- **Simulé sans ambiguïté** (déjà documenté comme tel dans le code, ex. `docs/settings-v0.11.md`, `js/settings-catalog.js`) : authentification, notifications externes (e-mail/push/SMS), langue/fuseaux, stockage de logo/documents, numérotation comptable définitive.
- **Partiellement fonctionnel** : fiche client « documents liés »/« RDV liés » (recopiés manuellement, pas une vraie relation en base) ; réglages de référentiels (statuts personnalisables) qui n'ont pas d'effet sur le modèle de données sous-jacent.
- **Purement démonstratif** : historique de communication typé côté client, notes archivées, KPIs décoratifs par client (« avantages accordés »), préparation commerciale du RDV (arguments/objections/prix cible).
- **Absent** : tout ce qui suppose un serveur (persistance réelle, comptes, e-mail, paiement en ligne, stockage de fichiers, sauvegarde, facturation électronique réglementaire).

---

## 3. Parcours cœur du MVP

Le parcours déjà esquissé par la structure du produit (RDV → devis brouillon lié → facture liée au devis → paiement → alertes) correspond au produit existant ; il est retenu tel quel.

| Étape | Action utilisateur | Donnée produite | Impact sur le cockpit | Action suivante possible |
|---|---|---|---|---|
| 1 | Créer une fiche client minimale | `Client` | Devient sélectionnable partout | Planifier une action |
| 2 | Créer un rendez-vous / une action commerciale liée au client, avec potentiel estimé | `Appointment` | Alimente **Priorités du jour** (si aujourd'hui) et **Opportunités** (si fort potentiel) | Créer un devis |
| 3 | Créer un devis (lignes, TVA, client) et l'envoyer | `Quote` (statut *envoyé*) | Alimente **Opportunités** (devis ouvert) ; après le seuil de relance, **À surveiller** | Relancer, ou transformer en facture |
| 4 | Transformer le devis accepté en facture | `Invoice` (statut *émise*) | Alimente **Ma situation** (CA facturé) | Encaisser |
| 5 | Enregistrer un paiement (total ou partiel) | `Payment` | Recalcule le statut de la facture et le reste à encaisser | Suivre l'échéance |
| 6 | Si l'échéance est dépassée sans paiement | *(rien à faire — automatique)* | Le moteur d'insights fait apparaître l'alerte « facture en retard » dans **À surveiller** | Relancer le client depuis l'alerte |
| 7 | Ouvrir le Dashboard | *(rien à saisir)* | Situation, attention, priorités, opportunités affichées en 30 secondes | Agir directement depuis les liens du Dashboard |

Ce parcours est le seul qui justifie, à lui seul, l'existence de chaque écran P0 (§7 et §10). Toute fonctionnalité qui ne s'y rattache pas doit être justifiée séparément ou reportée.

---

## 4. Périmètre MVP par fonctionnalité

Légende : **P0** indispensable · **P1** important rapidement après lancement · **P2** évolution future · **Hors périmètre** délégué ou non pertinent pour ce produit.

| Fonctionnalité | Catégorie | Justification courte |
|---|---|---|
| Dashboard 5 niveaux sur données réelles | **P0** | C'est le produit. |
| Authentification réelle (email + mot de passe, session) | **P0** | Sans elle, aucune commercialisation responsable. |
| Une organisation = une entreprise, données isolées | **P0** | Condition de base d'un SaaS multi-clients. |
| Client : identité, coordonnées, statut, dernier contact | **P0** | Nécessaire aux règles d'insights (à relancer / fidèle inactif) et au parcours. |
| Client : devis/factures réellement liés (vraie relation, pas recopiés) | **P0** | Remplace le « documents liés » actuellement simulé. |
| RDV/action commerciale : liste datée, statut, client lié, potentiel | **P0** | Alimente priorités du jour et opportunités. |
| Vue calendrier visuelle complète (jour/semaine/mois) | **P1** | Confort réel, mais une liste triée par date suffit à alimenter le cockpit. |
| Préparation commerciale détaillée du RDV (arguments, objections, prix cible/mini) | **P2** | Séduisant mais non lié à la promesse « 30 secondes ». |
| Devis : création, lignes, TVA, statut, transformation en facture, PDF | **P0** | Étape obligatoire du parcours cœur. |
| Versions multiples par devis | **P1** | Utile en usage réel, pas bloquant pour prouver la valeur. |
| Facture : création, lignes, statut calculé, échéance, mentions légales, PDF | **P0** | Obligation légale + alimente trésorerie/alertes. |
| Numérotation de facture séquentielle et fiable (sans trou) | **P0** | Obligation légale française ; c'est justement ce que la V0 qualifie elle-même d'« indicatif » 🔍 — doit devenir réel en V1. |
| Avoirs / notes de crédit | **P1** | Fréquent mais une correction manuelle simple suffit au lancement. |
| Paiement : saisie manuelle, partiel, reste à encaisser | **P0** | Le cockpit doit savoir ce qui est encaissé. |
| Paiement en ligne (carte, lien de paiement) | **P1** | Confort clients, pas condition de la promesse. |
| Connexion bancaire automatique | **Hors périmètre (pour l'instant)** | Explicitement exclu de cette étape ; à réévaluer en P2 si la demande est confirmée. |
| Trésorerie : mouvements prévus/réalisés, solde, projection courte | **P0 réduit** | Alimente directement le Dashboard (KPI + alertes). |
| Catégories de charges personnalisables, récurrence configurable | **P1** | Confort de saisie, pas indispensable au calcul. |
| Comptabilité complète (écritures, bilan, liasse fiscale) | **Hors périmètre** | Hors promesse ; à déléguer à un expert-comptable / logiciel comptable. |
| Tâches simples (titre, priorité, fait/pas fait) | **P0** | Alimentent directement les priorités du jour. |
| Moteur d'insights (règles V0.13, sans nouvelle règle) | **P0** | Déjà conçu, testé, découplé du rendu — à rebrancher sur des données persistées. |
| Catalogue Produits/Services structuré | **P1** | Les lignes de devis peuvent être libres au lancement. |
| Page Analyses (5 onglets, graphiques) | **P2 / repoussée** | Le Dashboard fournit déjà l'essentiel (choix déjà amorcé en V0.12.1). |
| Export simple des données (CSV) | **P1** | Utile en attendant une page Analyses, peu coûteux. |
| Paramètres : entreprise (mentions légales), objectifs Dashboard, seuils d'alertes | **P0 réduit** | Nécessaires aux documents et au moteur d'insights. |
| Paramètres : apparence, référentiels de statuts personnalisables, langue/fuseaux | **P2** | Déjà marqués V1 dans le code lui-même pour la plupart 🔍 ; confort, pas nécessité. |
| Génération PDF fiable, facture émise immuable | **P0** | Obligation légale ; la V0 respecte déjà ce principe pour les snapshots 🔍, à conserver. |
| Stockage de logo / pièces jointes | **P1** | Confort visuel des documents, pas bloquant. |
| Sauvegarde automatique de la base | **P0** | Condition minimale de confiance commerciale. |
| Abonnement payant (offre, paiement récurrent, statut) | **P0** | Sans lui il n'y a pas de commercialisation. |
| Multi-utilisateur simple (plusieurs comptes par organisation, sans rôles) | **P1** | Utile rapidement (la cible va jusqu'à 10 personnes) mais le MVP peut être mono-utilisateur. |
| Permissions / rôles granulaires | **P2** | Le brief le souligne explicitement : pas nécessaire du fait de la taille de cible. |
| Facturation électronique réglementaire (transmission via plateforme agréée) | **P1 pour l'intégration** (voir §6) | Cockpit ne doit pas devenir une plateforme agréée ; doit prévoir le branchement. |
| IA / recommandations automatiques | **Hors périmètre** | Contraire à la consigne « pas d'IA » de toutes les itérations précédentes ; aucune raison d'y déroger au MVP. |

---

## 5. Cœur fonctionnel — détail par domaine

**Dashboard.** P0 : les 5 niveaux existants, rebranchés sur des données persistées par organisation. Aucune nouvelle règle d'insight à ce stade — le moteur (`js/insights-engine.js`) est déjà une fonction pure `compute(context)` : c'est le contexte (aujourd'hui statique/en mémoire) qui doit devenir une lecture de base de données, pas le moteur lui-même. 🔍 C'est le principal atout technique à préserver tel quel.

**Clients.** P0 : nom, entreprise, coordonnées, statut (dont `a-relancer`/`fidele`, consommés par le moteur), dernier contact, une zone de notes simple, devis/factures/RDV réellement liés (clé étrangère, pas recopiés). Hors P0 : historique de communication typé, notes archivées séparées, KPIs décoratifs par client, champs personnalisés.

**Devis.** P0 : création à partir de lignes libres (désignation, quantité, prix HT, TVA, remise), client lié, statut (brouillon/envoyé/accepté/refusé), transformation en facture, export PDF. Hors P0 : versions multiples, modèles de document personnalisables.

**Factures.** P0 minimal pour fonctionner réellement en France : numéro séquentiel fiable, date d'émission/échéance, mentions légales obligatoires (SIREN/SIRET, TVA le cas échéant, pénalités de retard), statut de paiement calculé, immutabilité après émission, export PDF. Ne pas tout construire nous-mêmes : la **transmission réglementée** (facturation électronique) est une fonction à déléguer (§6), pas à développer.

**Paiements.** P0 : enregistrement manuel (date, montant, mode), gestion du paiement partiel, statut recalculé automatiquement. Pas de connexion bancaire à ce stade.

**Agenda / RDV.** P0 : liste de rendez-vous/actions datés, liés à un client, avec statut et potentiel commercial estimé (repris tel quel du modèle actuel `opportunite`/`montantPotentiel`, déjà consommé par le moteur). La vue calendrier visuelle complète (grille horaire jour/semaine/mois) n'est **pas** P0 : une liste triée par date suffit à alimenter le Dashboard et à gérer le parcours.

**Tâches.** P0 : titre, priorité, fait/pas fait — strictement ce qu'il faut pour alimenter les priorités du jour.

**Trésorerie.** Distinction à respecter strictement : Cockpit Entrepreneur ne fait ni comptabilité (écritures, bilan) ni rapprochement bancaire automatique. P0 : trésorerie opérationnelle simple — mouvements prévus/réalisés saisis manuellement, solde estimé, projection sur un horizon court. C'est le minimum cohérent avec la promesse.

**Analyses.** Non indispensable au MVP en tant que page séparée. Le Dashboard (situation + performance) couvre l'essentiel de ce qu'un dirigeant regarde en usage courant ; un export CSV simple (P1) couvre les besoins ponctuels d'analyse plus poussée sans construire une page entière.

---

## 6. Fonctions SaaS indispensables

| Élément | Besoin MVP | Catégorie |
|---|---|---|
| **Comptes** | Authentification réelle (email/mot de passe hashé), récupération de mot de passe, session expirable | **P0** |
| **Double authentification (2FA)** | Non requise pour ouvrir, activable | **P1** |
| **Entreprise / Organization** | Une organisation = une entité légale ; toutes les données rattachées à l'organisation, isolation stricte testée | **P0** |
| **Multi-entités légales par compte** | Un utilisateur ne gère qu'une seule entreprise au MVP | **P2** — ❓ à confirmer : certains indépendants cumulent plusieurs structures |
| **Multi-utilisateur** | Plusieurs comptes par organisation, sans permissions différenciées (tout le monde voit/édite tout) | **P1** |
| **Permissions / rôles granulaires** | Non nécessaire à ce stade (cible ≤ 10 personnes, pas d'exigence de séparation des rôles observée) | **P2** |
| **Persistance** | Client, RDV/Action, Tâche, Devis (+ lignes), Facture (+ lignes), Paiement, Mouvement de trésorerie, Paramètres — voir §9 | **P0** |
| **Documents** | Génération PDF fiable, facture émise immuable, téléchargement ; stockage de pièces jointes/logo | PDF+immutabilité **P0**, stockage fichiers **P1** |
| **Sauvegarde** | Sauvegarde automatique quotidienne de la base, restauration testée avant bêta | **P0** |
| **Sécurité** | HTTPS partout, mots de passe hashés (bcrypt/argon2), isolation stricte entre organisations, pas de secrets côté client | **P0** |
| **RGPD** | Politique de confidentialité publiée, export des données personnelles sur demande, suppression de compte avec effacement associé | **P0** minimal |
| **Abonnement** | Une offre payante, paiement récurrent, statut d'abonnement conditionnant l'accès | **P0** |

Aucun de ces éléments n'est développé à cette étape — seul le besoin est défini, conformément à la consigne de cadrage.

---

## 7. Contraintes réglementaires et facturation

Frontière produit/architecture proposée :

**Ce que Cockpit doit gérer lui-même (P0) :**
- Contenu de la facture (mentions légales obligatoires déjà connues du modèle actuel : SIREN/SIRET, TVA, pénalités de retard, mention d'acompte) ;
- Numérotation séquentielle fiable et sans trou ;
- Immutabilité de la facture après émission ;
- Export PDF lisible et téléchargeable par le client final.

**Ce qui doit être délégué à un service spécialisé ou une Plateforme de Dématérialisation Partenaire (P1, intégration) :**
- Transmission réglementée de la facture électronique (format structuré, ex. Factur-X) et son acheminement via une plateforme agréée par l'administration ;
- Toute obligation de e-reporting associée.

**❓ À confirmer avant implémentation** (non vérifiable depuis ce dépôt, nécessite une validation juridique/comptable à jour au moment du développement) :
- Le calendrier et le périmètre exact d'obligation de facturation électronique applicable à la cible (indépendants et TPE) — la réglementation française évolue et dépend de la taille et du statut de l'entreprise cliente ;
- La liste des mentions légales obligatoires à jour selon le régime de TVA de l'utilisateur (franchise en base ou non) ;
- Les obligations d'archivage légal des factures (durée, format).

Principe retenu : **Cockpit Entrepreneur émet et gère ses factures, mais ne devient pas lui-même une Plateforme de Dématérialisation** — il s'intègre à une plateforme partenaire existante le moment venu (P1), sans réinventer la conformité réglementaire.

---

## 8. Intégrations

| Intégration | Catégorie | Justification |
|---|---|---|
| Plateforme de facturation électronique (PDP) | **P1** | Nécessaire à terme pour rester conforme, pas bloquante pour une première bêta facturant en dehors du périmètre d'obligation immédiat (❓ à confirmer, voir §7). |
| Paiement en ligne (carte / lien de paiement) | **P1** | Accélère l'encaissement mais la saisie manuelle suffit à ce que le cockpit « sache » ce qui est payé. |
| Banque (connexion / agrégation) | **P2** | Explicitement exclue de cette étape ; forte valeur perçue mais coût d'intégration et de conformité élevé pour un MVP. |
| Calendrier externe (Google/Microsoft) | **P2** | Séduisant pour les TPE déjà équipées, mais le MVP n'a même pas de vue calendrier visuelle (P1) — prématuré. |
| E-mail transactionnel (envoi de devis/factures, notifications) | **P0** | Sans lui, un devis ou une facture ne peut pas être envoyé au client — condition du parcours cœur, pas une intégration secondaire. |
| Notifications push/SMS | **P2** | Confort, aucune donnée ne suggère qu'elles sont attendues au lancement. |
| Comptabilité (export vers logiciel comptable / expert-comptable) | **P1** | Cockpit ne fait pas de comptabilité (§5) mais un export exploitable par l'expert-comptable a une forte valeur perçue rapide. |

Principe : une intégration n'est P0 que si le MVP perd une partie essentielle de sa valeur sans elle — c'est le cas de l'e-mail transactionnel (envoyer un devis/une facture fait partie du parcours cœur), pas des autres.

---

## 9. Modèle de données conceptuel

| Entité | Rôle | Relations principales |
|---|---|---|
| **User** | Compte d'authentification d'une personne | appartient à une `Organization` |
| **Organization** | L'entreprise du client Cockpit ; unité d'isolation des données | possède `Client`, `Appointment`, `Task`, `Quote`, `Invoice`, `CashMovement`, `Settings` |
| **Client** | Personne ou entreprise démarchée/servie | appartient à `Organization` ; référencé par `Appointment`, `Quote`, `Invoice` |
| **Appointment** (RDV / action commerciale) | Étape du pipeline commercial, alimente priorités et opportunités | appartient à `Organization`, lié à `Client`, optionnellement à `Quote` |
| **Task** | Tâche simple | appartient à `Organization`, optionnellement liée à `Client` |
| **Quote** + **QuoteLine** | Devis et ses lignes | appartient à `Organization`, lié à `Client` ; peut donner naissance à une `Invoice` |
| **Invoice** + **InvoiceLine** | Facture et ses lignes | appartient à `Organization`, lié à `Client`, optionnellement à `Quote` ; possède des `Payment` |
| **Payment** | Encaissement (total ou partiel) | lié à `Invoice` |
| **CashMovement** | Mouvement de trésorerie prévu/réalisé (charge principalement) | appartient à `Organization` |
| **Settings** | Informations légales entreprise, objectifs Dashboard, seuils d'alertes | appartient à `Organization` |
| **ProductService** *(P1)* | Catalogue réutilisable de prestations | appartient à `Organization`, référencé en autocomplétion par `QuoteLine`/`InvoiceLine` |

**Entité volontairement absente : `Insight`.** Le moteur d'insights recalcule ses résultats à la demande à partir des entités ci-dessus (c'est déjà son fonctionnement actuel, `compute(context)` étant une fonction pure) : rien ne justifie de les persister au MVP. Une table de cache pourra être envisagée plus tard si la performance l'exige, pas avant.

**Entités volontairement absentes de la V0** et non réintroduites : `Opportunity` comme entité séparée (le potentiel commercial reste un attribut de `Appointment`, comme aujourd'hui — inutile de créer un pipeline CRM distinct) ; `Role`/`Permission` (P2, voir §6) ; `Document`/`Attachment` en tant que persistance de fichiers arbitraires (P1, limité aux PDF générés + logo).

---

## 10. Écrans du MVP

| Écran | Objectif | P0 | Repoussé |
|---|---|---|---|
| Connexion / Inscription / Mot de passe oublié | Accès réel au compte | Formulaire, session, réinitialisation par e-mail | 2FA (P1) |
| **Dashboard** | Point d'entrée, cœur du produit | 5 niveaux sur données réelles | — |
| Clients (liste + fiche) | Gérer la base client minimale | Identité, statut, dernier contact, devis/factures/RDV liés | Historique typé, notes archivées, KPIs décoratifs, champs personnalisés (P1/P2) |
| Rendez-vous / Actions (liste) | Suivre le pipeline commercial | Liste triée par date, statut, client, potentiel | Vue calendrier visuelle (P1), préparation commerciale détaillée (P2) |
| Devis (liste + édition + impression) | Émettre une proposition commerciale | Lignes, TVA, statut, transformation en facture, PDF | Versions multiples (P1) |
| Facturation (liste + édition + impression + paiement) | Facturer et suivre l'encaissement | Lignes, statut calculé, PDF, saisie de paiement | Avoirs (P1) |
| Trésorerie (vue simple) | Visibilité entrées/sorties | Mouvements, solde, projection courte | Catégories personnalisables, récurrence (P1) |
| Paramètres (réduit) | Informations légales + seuils | Entreprise (mentions légales), objectifs Dashboard, seuils d'alertes | Apparence, référentiels personnalisables, langue (P2) |
| Facturation → Abonnement | Rendre le SaaS payant | Offre, paiement récurrent, statut | — |

**Écrans de la V0 qui disparaissent ou fusionnent au MVP :** Analyses (repoussée, §4) ; Produits/Services comme écran dédié (fusionné dans la sélection de ligne de devis, catalogue en P1) ; les vues calendrier Jour/Semaine/Mois d'Agenda (remplacées par une liste au P0, réintroduites en P1) ; la fiche RDV détaillée avec préparation commerciale complète (allégée au P0).

---

## 11. Definition of Done du MVP

Le MVP est prêt pour une bêta payante quand, concrètement :

1. **Workflow métier** : un utilisateur peut, sans intervention technique, créer un client, un rendez-vous, un devis, le transformer en facture, enregistrer un paiement, et voir le Dashboard refléter ce changement immédiatement.
2. **Données persistantes** : aucune donnée métier ne dépend de la mémoire de la page ; un rechargement, une déconnexion ou un changement d'appareil ne perdent rien.
3. **Dashboard réel** : les 5 niveaux fonctionnent sur les données propres à l'organisation connectée, pas sur un jeu de démonstration.
4. **Sécurité** : connexion HTTPS obligatoire, mots de passe hashés, isolation des données entre organisations vérifiée par un test automatisé (aucune fuite croisée).
5. **Facturation / documents** : numérotation de facture séquentielle sans trou, mentions légales obligatoires présentes, facture émise immuable, PDF téléchargeable.
6. **Mobile** : Dashboard et écrans P0 utilisables sur un écran ≈ 390 px sans défilement horizontal ni information cachée (méthode de vérification établie en V0.13.1).
7. **Tests** : suite automatisée couvrant au minimum le moteur d'insights, le calcul des statuts devis/factures, et l'isolation des données entre organisations.
8. **Sauvegardes** : sauvegarde automatique quotidienne de la base, procédure de restauration testée au moins une fois avant la bêta.
9. **Erreurs** : aucune page blanche ; erreurs journalisées côté serveur ; le Dashboard se dégrade proprement (message clair) si une donnée manque, plutôt que de planter.
10. **Monitoring minimal** : suivi de disponibilité et des erreurs serveur consultable par l'équipe avant la bêta.
11. **Abonnement** : au moins une offre payante active, moyen de paiement enregistrable, statut d'abonnement conditionnant l'accès au produit.
12. **Conformité minimale** : politique de confidentialité publiée, export et suppression des données personnelles disponibles sur demande.

---

## 12. NOT NOW

Fonctions volontairement écartées du MVP — ce garde-fou s'applique aux itérations futures tant qu'il n'est pas explicitement révisé :

- IA conversationnelle ou recommandations automatiques (déjà exclu de toutes les itérations précédentes) ;
- Prévisions financières avancées (au-delà de la projection de trésorerie courte déjà présente) ;
- Application mobile native (le web responsive suffit) ;
- Comptabilité complète (écritures, bilan, liasse fiscale, rapprochement bancaire automatique) ;
- Gestion RH (paie, plannings d'équipe, congés) ;
- Gestion de stock avancée ;
- Marketing automation (séquences d'e-mails, scoring de leads) ;
- CRM avancé (historique de communication typé, notes archivées, champs personnalisés, scoring) ;
- Workflow personnalisable par l'utilisateur ;
- Marketplace ou place de marché ;
- Automatisations avancées au-delà des règles d'insights actuelles ;
- Permissions et rôles granulaires par utilisateur ;
- Multi-entités légales par compte ;
- Connexion bancaire automatique ;
- Vue calendrier synchronisée bidirectionnellement avec des outils externes ;
- Modèles de documents personnalisables graphiquement ;
- Versionning avancé des devis, avoirs complexes.

---

## 13. Priorisation par valeur des fonctions P0

| Fonction P0 | Centraliser | Comprendre | Agir | SaaS exploitable |
|---|:---:|:---:|:---:|:---:|
| Dashboard 5 niveaux | | ✔ | ✔ | |
| Moteur d'insights sur données réelles | ✔ | ✔ | ✔ | |
| Client (fiche réduite + relations réelles) | ✔ | | | |
| RDV/Action (liste + potentiel) | ✔ | | ✔ | |
| Devis → Facture → Paiement | ✔ | | ✔ | |
| Trésorerie simple | ✔ | ✔ | | |
| Tâches | ✔ | | ✔ | |
| Paramètres (entreprise, objectifs, seuils) | ✔ | | | ✔ |
| Authentification, isolation, sauvegarde | | | | ✔ |
| Abonnement payant | | | | ✔ |
| PDF/mentions légales/numérotation | | | ✔ | ✔ |

Lecture : le périmètre P0 n'est pas déséquilibré vers une seule dimension — Centraliser et Agir dominent logiquement (le parcours cœur produit et consomme des données), Comprendre reste porté presque entièrement par le Dashboard/moteur d'insights (cohérent avec le positionnement), et le socle SaaS a son propre bloc de fonctions dédiées, nécessaire mais non substituable aux trois piliers produit.

---

## 14. Registre des hypothèses produit à valider

Aucune de ces hypothèses n'a été testée auprès d'utilisateurs réels. Elles conditionnent des choix de ce document et doivent être vérifiées dès que les tests utilisateurs reprendront.

| # | Hypothèse | Nature | Comment la valider |
|---|---|---|---|
| H1 | Le Dashboard décisionnel (situation/attention/priorités/opportunités) est ce qui pousse un TPE à ouvrir l'app quotidiennement, plus que les modules de gestion eux-mêmes | Positionnement | Tests utilisateurs + mesure de fréquence d'ouverture en bêta |
| H2 | Une TPE de service accepte de payer pour un outil qui centralise et éclaire, sans remplacer sa comptabilité ni son CRM | Positionnement / pricing | Entretiens de vente, tests de prix |
| H3 | Un agenda simplifié (liste d'actions triée par date, sans vue calendrier visuelle) suffit au lancement | Périmètre fonctionnel | Tests utilisateurs ; risque si la cible juge cela trop pauvre par rapport à ses habitudes (Google Agenda, etc.) |
| H4 | Repousser la page Analyses en P2 ne prive pas d'un besoin critique dès le lancement | Périmètre fonctionnel | Tests utilisateurs, suivi des demandes en bêta |
| H5 | Les 4 règles d'opportunités actuelles (client à relancer, client fidèle inactif, devis à forte valeur, RDV à fort potentiel) sont perçues comme utiles, pas comme du bruit | Fonctionnalité | Tests utilisateurs, mesure de clics sur les opportunités |
| H6 | Un catalogue Produits/Services structuré n'est pas indispensable dès le jour 1 (lignes de devis libres suffisent) | Périmètre fonctionnel | Entretiens avec des métiers à prestations répétitives (artisans, etc.) |
| H7 | Une organisation = une seule entité légale suffit au lancement | Périmètre fonctionnel | Entretiens ; certains indépendants cumulent plusieurs structures |
| H8 | Le MVP mono-utilisateur par organisation (multi-utilisateur en P1) ne bloque pas la vente à des équipes de 2 à 10 personnes | Périmètre fonctionnel / pricing | Entretiens de vente auprès de la cible haute (5-10 personnes) |
| H9 | La fourchette de prix acceptable pour la cible se situe dans une gamme d'abonnement SaaS TPE classique | Pricing | Aucune donnée à ce stade ; entretiens de prix indispensables avant de fixer une offre |
| H10 | La promesse « en 30 secondes » reste vraie une fois le produit alimenté par de vraies données, potentiellement plus nombreuses et moins propres que le jeu de démonstration | UX / produit | Tests utilisateurs avec import de données réelles |

---

## 15. Validation finale

1. **Peut-on retirer encore une fonctionnalité sans casser la proposition de valeur ?** Le catalogue Produits/Services a été retiré du P0 (lignes libres suffisent) ; la vue calendrier visuelle a été retirée du P0 (liste triée suffit) ; la page Analyses a été intégralement repoussée. Au-delà, retirer le Dashboard, l'authentification, les devis/factures/paiements ou la persistance romprait soit la promesse, soit la commercialisation elle-même.
2. **Chaque P0 est-il réellement indispensable ?** Oui, chacun échoue le test « sans lui, la promesse ne tient pas ou la commercialisation est impossible/irresponsable » (§4), à l'exception du couple e-mail transactionnel/numérotation fiable qui a été reclassé P0 précisément parce qu'il échoue ce test s'il est absent.
3. **Le Dashboard peut-il fonctionner avec les données retenues ?** Oui : chaque entité du modèle conceptuel (§9) correspond directement à une donnée déjà consommée par le moteur d'insights actuel (`docs/insights-engine.md`) — aucune donnée manquante, aucune donnée superflue ajoutée pour l'occasion.
4. **Avons-nous accidentellement recréé un ERP ?** Non : la comptabilité complète, la gestion RH, le stock avancé et les permissions granulaires sont explicitement hors périmètre (§12) ; la trésorerie reste opérationnelle et non comptable (§5).
5. **Pourrait-on raisonnablement mettre cette version entre les mains d'un entrepreneur et lui demander de payer ?** Sous réserve du socle SaaS (§6, §11) effectivement construit — oui : le parcours cœur (§3) est complet de bout en bout, le Dashboard est réel, et les obligations légales de facturation minimales sont couvertes. C'est un pari (H1-H10 restent à valider), pas une certitude — raison d'être de la bêta.
