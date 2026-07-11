# Backlog produit

Ce document regroupe les idées et pistes identifiées au fil du projet, non traitées immédiatement. Il reste volontairement synthétique : l'objectif est de ne perdre aucune idée importante, pas de détailler chaque point comme un cahier des charges.

## Tableau de bord
- Amélioration plus poussée du widget Agenda (identifiée lors de la validation V0.1.1).
- Vrai système de personnalisation des KPI (bouton "Personnaliser les indicateurs" ajouté en Work in progress en V0.3).
- Vrai graphique d'évolution du CA, basé sur des données réelles.
- Priorité du jour réellement modifiable par l'utilisateur.
- Vraie logique de tâches (création, modification, suppression) — "Ajouter une tâche" reste en Work in progress depuis la V0.1.1/V0.3.
- Panneau "Voir toutes les alertes" agrégeant l'ensemble des alertes, si un tel besoin se confirme (pas de page cible aujourd'hui).
- Si un module Fournisseurs voit le jour, revoir "Appeler le fournisseur Dupont" (non cliquable en V0.3, faute de destination).

## Navigation
- Harmonisation du sélecteur de date sur toutes les pages (actuellement présent uniquement sur le tableau de bord, décision assumée en V0.1.1).
- Réflexion sur une architecture à composants/templates pour éliminer la duplication de la sidebar et de la topbar entre les fichiers HTML.

## Clients / CRM
- Création, modification et suppression réelles de clients (bouton "Ajouter un client" et "Modifier" toujours en Work in progress).
- **Vrai changement de statut persistant** : la modale "Modifier le statut client" (V0.4.3) ouvre un vrai sélecteur, mais "Enregistrer" ne modifie rien durablement (ferme la modale + Work in progress).
- **Vraie personnalisation des statuts** (ajout/modification/suppression) : la modale "Personnaliser les statuts clients" (V0.4.3) est un placeholder visuel complet (liste, icônes, bouton "Ajouter un statut") sans aucune logique réelle. La liste actuelle (Prospect, Client actif, À relancer, Inactif, Fidèle, Litige) reste centralisée dans `js/app.js` (`CLIENT_STATUSES`, exposée via `window.COCKPIT_CLIENT_STATUSES`).
- Tri des colonnes de la liste clients (non traité ; pagination ajoutée en V0.5.4 via `window.COCKPIT_LIST_PAGINATION`).
- **Sauvegarde du nombre d'éléments par page choisi (V0.5.4)** : le sélecteur "Afficher X" repart toujours à 5 au rechargement de la page, aucune préférence n'est mémorisée (pas de `localStorage`, hors périmètre V0).
- **`CLIENT_DETAILS` (V0.4.2, étendu en V0.4.3 avec `notesArchive`) reste une source statique en mémoire** : à remplacer par une vraie source de données (backend) le jour où le projet en aura une. Actuellement limitée aux 6 clients déjà présents dans `clients.html`.
- Personnalisation réelle des champs du bloc Informations client (icône "Personnaliser les champs" en Work in progress depuis la V0.4.2).
- **Vraie création/édition/suppression de notes commerciales** : les modales "Ajouter une note"/"Modifier la note"/"Supprimer cette note ?" (V0.4.3) s'ouvrent réellement (textarea pré-rempli pour l'édition, extrait pour la suppression) mais aucune validation n'est persistée. La modale "Toutes les notes commerciales" reste en lecture seule (pas d'icônes modifier/supprimer sur les notes archivées).
- Page ou panneau complet "Voir tout l'historique" des échanges (reste en Work in progress ; historique limité à 5 événements par client sur la fiche).
- Téléchargement PDF réel des documents liés à un client (bouton "Télécharger PDF" en Work in progress).
- Vrai menu d'actions pour le bouton "…" de la fiche client (aucun composant de menu contextuel dans le projet à ce jour).
- Le moteur de modale générique (`COCKPIT_MODAL`, V0.4.3) est réutilisable par d'autres pages si un besoin de modale apparaît ailleurs dans l'application.
- Le helper de pagination générique (`COCKPIT_LIST_PAGINATION`, V0.5.4) est réutilisable tel quel pour toute future liste tabulaire (Devis/Factures en V0.6, Agenda en V0.7, Trésorerie en V0.8...) : il suffit de lui fournir les lignes, les champs de recherche/filtre/pagination et une fonction `matchRow` propre à la page.

## Agenda
- Résolu en V0.7 : liaison dynamique fiche client ↔ Agenda (bloc "Rendez-vous liés" réel, `agenda.html?client=slug`), ciblage d'un rendez-vous précis (`fiche-rdv.html?rdv=<id>`) et gestion réelle des rendez-vous (création, modification, suppression, en mémoire de page).
- Résolu en V0.7.1 : vues calendrier Jour/Semaine/Mois réellement interactives (navigation temporelle par date picker, sélecteurs semaine/mois+année, panneau résumé en vue Jour), en complément de la vue Liste existante depuis la V0.7.
- Bouton "Dupliquer ce rendez-vous" : proposé en analyse V0.7 mais explicitement non développé (décision du chef de projet), pourrait être utile pour les rendez-vous récurrents avec un même client.
- **`RDV_DETAILS` (V0.7) reste une source statique en mémoire**, limitée à 6 rendez-vous fictifs : mêmes limites que `CLIENT_DETAILS`/`DEVIS_DETAILS`/`FACTURE_DETAILS`, à remplacer par une vraie source de données le jour où le projet en aura une.
- **Limite assumée de la persistance en mémoire de page** : un rendez-vous (et son devis brouillon auto-créé) créé en direct pendant une session n'existe que dans la page courante ; ouvrir son devis lié dans un nouvel onglet ou après un rechargement affiche l'état "Document introuvable" déjà géré proprement — comportement identique à celui de toute création réelle ailleurs dans l'application, pas une limite propre à l'Agenda.

## Facturation
- Page placeholder ajoutée à la navigation en V0.2 ; devenue la vraie liste des devis en V0.6.1 (recherche, filtre statut, pagination), avec un éditeur de devis complet (`pages/devis-edition.html`) ; l'onglet Factures est devenu réel en V0.6.2 (`pages/facture-edition.html`) ; documents imprimables/PDF ajoutés en V0.6.3 (`pages/devis-document.html`, `pages/facture-document.html`).
- **Vraie création, modification, suppression de devis** : le générateur (client, lignes, calculs HT/TVA/TTC/remise, conditions de paiement) est entièrement fonctionnel en direct, mais "Enregistrer" (menu brouillon/version définitive) et "Supprimer" ne persistent rien (Work in progress).
- **`DEVIS_DETAILS` (V0.6.1) reste une source statique en mémoire**, limitée à 6 devis fictifs (dont `DEV-2026-00016` ajouté en V0.6.2 pour démontrer la conversion) : à remplacer par une vraie source de données le jour où le projet en aura une.
- **Vraie numérotation persistante** : `computeNextDevisNumero`/`computeNextFactureNumero` calculent un numéro plausible par balayage des données fictives existantes, sans allocation réelle ni compteur qui survivrait à un rechargement.
- **Vrai versionnement persistant** : "Créer une nouvelle version" (correctif de revue V0.6.1) ouvre désormais un brouillon éditable réel basé sur la dernière version, mais uniquement en mémoire de page — rien n'est conservé après rechargement, faute de persistance réelle.
- **`FACTURE_DETAILS` (V0.6.2) reste une source statique en mémoire**, limitée à 6 factures fictives (dont un brouillon sans numéro) : mêmes limites que `DEVIS_DETAILS`.
- **Vraie émission/persistance de facture** : "Émettre la facture" et "Ajouter un paiement" sont des actions réelles en mémoire de page (numérotation, verrouillage, recalcul du reste à payer), mais rien ne survit à un rechargement ; "Enregistrer le brouillon"/"Supprimer le brouillon" restent en Work in progress.
- **Avoirs non développés** : l'annulation d'une facture déjà émise est volontairement bloquée en V0.6.2 (aucune action, juste une note explicative) — à traiter dans une future version dédiée aux avoirs.
- **Documents imprimables (V0.6.3)** : `pages/devis-document.html`/`pages/facture-document.html` s'appuient sur l'impression navigateur (`window.print()` + `css/print.css`), volontairement sans bibliothèque PDF externe — solution jugée suffisante tant qu'aucun besoin de génération automatique sans interaction utilisateur ou de mise en page pixel-perfect garantie cross-navigateur ne se présente. À réévaluer seulement si un tel besoin apparaît clairement.
- **Aperçu/impression non disponible pour un document en cours de frappe non enregistré** (choix explicite du chef de projet en V0.6.3, pour ne pas introduire de `sessionStorage`) : à revoir uniquement si une vraie persistance apparaît, ce qui rendrait la limite obsolète d'elle-même.
- Remise en montant fixe par ligne, en complément de la remise en pourcentage actuelle.
- **Statistiques et tableau de bord liés à la facturation (V0.6.4)** : bloc "Aperçu Facturation" au dashboard et bloc "Statistiques commerciales" sur `facturation.html`, tous deux calculés depuis `window.COCKPIT_FACTURATION_STATS.computeStats()` (CA facturé/encaissé, reste à encaisser, factures en retard, devis acceptés/refusés/envoyés, taux de transformation, panier moyen, top clients, prochaines échéances). Reste volontairement simple : pas de graphique, top clients/échéances limités aux 3 premiers ; à enrichir (période personnalisable, plus d'entrées, éventuel graphique) si un vrai besoin de pilotage plus poussé apparaît — une page dédiée pourrait alors se justifier, plutôt que d'alourdir `facturation.html`.
- **Factorisation du code dupliqué devis/facture** : recherche client, recherche catalogue, modale de description agrandie et rendu des conditions de paiement/parties/lignes/récapitulatif sont dupliqués entre `devis-edition.html`, `facture-edition.html`, `devis-document.html` et `facture-document.html` (choix assumé en V0.6.2 puis reconduit en V0.6.3 pour limiter le risque de régression et avancer vite) — la duplication s'étend maintenant sur 4 fichiers, ce point devient plus pressant à factoriser (sur le principe de `COCKPIT_LIST_PAGINATION`) dès qu'une prochaine version touche de nouveau ces pages.
- **Relances de paiement en retard** : les factures "En retard" sont détectées (`computeStatutAffiche`) mais aucune action de relance n'existe encore.
- **Personnalisation des modèles de document** (choix de mise en page, upload réel de logo) : volontairement hors périmètre de la V0.6.3, un seul modèle sobre étant proposé pour l'instant.
- **Fiche client (V0.6.4)** : la section "Documents & facturation" affiche désormais les devis/factures réels, mais reste non paginée (pas de souci avec 6 clients fictifs et peu de documents chacun ; à revoir si le volume augmente un jour) ; les entrées "Contrat" restent purement fictives (`btn-wip`), faute de module Contrats réel dans le projet.

## Trésorerie
- Page placeholder ajoutée à la navigation en V0.2 ; module fonctionnel réel construit en V0.8 (solde estimé, à encaisser/à décaisser, prochains mouvements, charges prévues, factures à encaisser, projection, alertes), affiné en V0.8.1/V0.8.2 (lisibilité du graphique, liens factures, montants non coupés).
- Synchronisation bancaire, rapprochement bancaire, comptabilité complète (hors périmètre tant qu'une vraie base de données n'existe pas — choix assumé, voir `docs/decisions.md`).

## Produits / Services
- Page placeholder ajoutée à la navigation en V0.2 ; catalogue consultable (recherche, filtres, accès fiche) construit en V0.5.1 ; fiche produit/service complète construite en V0.5.2 ; interactions préparatoires (modales) ajoutées en V0.5.3, corrigées et enrichies en V0.5.3.1 (bloc Coûts & marge, historique enrichi, badge Type cliquable, modifications bloc par bloc) ; pagination ajoutée en V0.5.4.
- **Vraie création, modification et suppression de produits/services** : les modales "Ajouter un produit / service" (catalogue), "Changer le type"/"Changer le statut"/"Modifier le nom"/"Modifier la description commerciale"/"Modifier les paramètres de vente"/"Modifier la note interne"/"Ajouter un coût" (fiche) s'ouvrent et se pré-remplissent réellement, mais aucune validation n'est persistée (`PRODUCT_DETAILS` reste inchangé).
- **`PRODUCT_DETAILS` (V0.5.1, enrichi en V0.5.2/V0.5.3/V0.5.3.1) reste une source statique en mémoire**, limitée aux 8 éléments fictifs du catalogue : à remplacer par une vraie source de données le jour où le projet en aura une.
- Catégories / familles de produits/services : volontairement absentes du tableau en V0.5.1 pour ne pas alourdir le catalogue ; à réévaluer plus tard si le volume le justifie.
- Unités personnalisables, gestion des stocks.
- **Vrai moteur de calcul de marge** : le bloc "Coûts & marge" (V0.5.3.1) calcule un total de coût local à l'affichage (somme de lignes `quantite × coutUnitaire`), et la modale "Détail de marge à venir" affiche les futures familles de coûts (production, mise en service, commercial, sous-traitance, frais variables, marge cible) toutes à "À définir". Marge estimée reste un champ texte statique, indépendant du coût calculé — aucune formule ne relie encore les deux.
- **Vraie sauvegarde des lignes de coût** : "Ajouter un coût" (V0.5.3.1) ouvre une modale réelle mais n'ajoute jamais de ligne au tableau `couts` affiché ; pas de modification/suppression de ligne existante non plus.
- Vrai calcul de TVA (dépendant du type de société, du régime fiscal, des Paramètres), affichage d'un prix TTC : la TVA reste indicative.
- Historique de ventes, statistiques de performance par produit/service.
- **Historique de l'offre toujours statique** : la modale "Historique complet de l'offre" affiche l'intégralité des événements écrits en dur par élément (`OFFER_HISTORY_TYPES`, incluant "Modification des modalités de paiement" depuis la V0.5.3), désormais avec heure et auteur fictif ("Administrateur principal", V0.5.3.1) ; aucun mécanisme n'enregistre automatiquement un changement réel, ni ne distingue plusieurs administrateurs.
- **Bloc "Utilisation future en facturation" supprimé en V0.5.3.1** (jugé trop déclaratif) : la préparation de la Facturation V0.6 repose désormais uniquement sur la structure des données (`PRODUCT_DETAILS`) et non plus sur un bloc dédié de la fiche ; à revoir lors de la construction réelle de la V0.6.
- **`STATUS_AVAILABILITY.selectionnable`** (posé en V0.5.2, plus affiché comme bloc dédié depuis la V0.5.3.1 mais toujours utilisé pour la carte KPI "Statut d'utilisation") **sert désormais aussi de filtre réel** dans la modale "Ajouter depuis le catalogue" du module Devis (V0.6.1) : seuls les produits/services au statut Actif y sont proposés. À réévaluer si un jour la "disponibilité en devis/facture" doit pouvoir diverger du statut brut (ex. un produit Actif volontairement exclu des devis).
- **Vraie personnalisation des statuts, des types et des modalités de paiement** (ajout/modification/suppression des valeurs elles-mêmes) : contrairement à la fiche client (V0.4.3), aucune modale de personnalisation n'est proposée pour les produits/services — seule la sélection parmi les valeurs existantes est proposée.
- Tri des colonnes du catalogue (non traité ; pagination ajoutée en V0.5.4 via `window.COCKPIT_LIST_PAGINATION`, partagé avec la liste Clients).
- **Sauvegarde du nombre d'éléments par page choisi (V0.5.4)** : repart toujours à 5 au rechargement, aucune préférence n'est mémorisée (pas de `localStorage`).

## Analyses (anciennement Finance)
- Page placeholder "Finance" ajoutée à la navigation en V0.2 ; renommée **Analyses** et construite en V0.9 sous forme de cockpit d'analyse transversal (Vue d'ensemble, Commercial, Clients, Activité, Trésorerie), recoupant les données déjà existantes plutôt que de dupliquer leurs calculs ; refonte visuelle en V0.9.1 (donuts, tunnel de conversion, cartes de synthèse).
- Bilan prévisionnel, compte de résultat, fiscalité avancée, scoring client complet : volontairement hors périmètre de la V0.9 (ce n'est pas un module de comptabilité) ; à réévaluer si un vrai besoin de pilotage financier plus poussé apparaît.
- Le sélecteur de période de la V0.9 ne recalcule finement que les onglets Commercial et Activité (devis/factures/rendez-vous créés dans la période) ; les agrégats Vue d'ensemble/Trésorerie restent des instantanés courants — à enrichir si un vrai besoin de comparaison période par période apparaît.

## Statistiques / Pilotage
- Non ajouté à la sidebar en V0.2 en tant que module séparé ; le besoin de pilotage transversal est désormais couvert par le module **Analyses** (V0.9, ex-Finance — voir plus haut), qui recoupe Facturation/Clients/Agenda/Trésorerie plutôt que d'ajouter un nouveau module dédié.
- Vrai système de statistiques avancées (le graphique du tableau de bord reste fictif et statique ; les graphiques réels du module Analyses restent simples — donuts et barres CSS, pas de librairie externe).
- Indicateurs de performance personnalisables.

## Paramètres
- Rendre fonctionnels les boutons "Modifier" des sections restantes (Préférences d'affichage, Notifications, Compte utilisateur, Objectifs mensuels, Sécurité) ; "Informations de l'entreprise" mène désormais à une vraie page (`pages/parametres-entreprise.html`, V0.6.1), mais "Enregistrer" n'y persiste rien.
- Gestion réelle du compte utilisateur et de la sécurité (mot de passe, etc.).
- **`COMPANY_SETTINGS` (V0.6.1) reste une source statique en mémoire** (un seul enregistrement fictif) : à remplacer par une vraie source de données le jour où le projet en aura une. Un logo réel (upload) reste hors périmètre (bouton "Changer le logo" en Work in progress).

## Notifications
- Vrai système de notifications (actuellement un badge fictif relié au pop-up "Work in progress").
- Panneau détaillé des notifications au clic sur la cloche.

## UX / UI
- `pages/database.html` : retirée de la navigation principale en V0.2 (le fichier existe toujours, orpheline, non liée depuis aucune page). Décision définitive (suppression du fichier ou refonte en un autre usage) à prendre lors d'une phase ultérieure.
- Travail futur sur l'identité visuelle et le logo (au-delà de l'affinage réalisé en V0.1.1).
- Amélioration responsive plus poussée (tablette/mobile), au-delà des ajustements déjà en place.
- Ajustements de design après retours utilisateurs réels.
- Résolu en V0.10.1 : incohérences de structure/composants identifiées lors de l'audit transversal (résumés du tableau de bord hors gabarit, fiche rendez-vous sans fil d'Ariane ni recherche/notification en topbar, ordre des boutons d'action différent entre l'éditeur de devis et l'éditeur de facture, ordre des icônes KPI de la Trésorerie, classe CSS orpheline sur Analyses).
- **Refonte structurelle complète du tableau de bord** : explicitement reportée à une future V0.10.2 (la V0.10.1 s'est limitée à des ajustements de cohérence mineurs, sans nouvelle organisation ni nouveau bloc).
- Liste "Devis" de `facturation.html` toujours codée en HTML statique (lignes en dur), contrairement à l'onglet "Factures" qui s'appuie sur un `tbody` rempli en JavaScript avec état vide dédié — même limite que la factorisation devis/facture déjà notée plus haut (section Facturation), volontairement non traitée en V0.10.1 (changement de pipeline de rendu, pas un ajustement purement visuel).

## Technique
- Vraie base de données et sauvegarde des informations.
- Authentification réelle (comptes, sessions, sécurité).
- Recherche globale unique, transverse à plusieurs modules à la fois (distincte des recherches/filtres par page déjà réels depuis la V0.4.1 sur Clients, Produits/Services, Agenda, Devis et Factures).
- Réflexion sur la sécurité et les droits d'accès utilisateurs.
- Résolu (régularisation Git de juillet 2026) : dépôt GitHub distant créé et poussé (`https://github.com/rambouraxel-del/application-entrepreneurs-v0.git`), voir `docs/versioning.md`.

## Idées long terme
- Application mobile / adaptation mobile complète.
- Intelligence artificielle intégrée au produit (hors périmètre explicite jusqu'à nouvel ordre).
- Gestion multi-utilisateurs pour une même entreprise.
