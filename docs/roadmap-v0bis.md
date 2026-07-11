# Roadmap V0 bis

Cette roadmap présente les phases prévues après la V0 initiale (livrée à l'étape 10, voir `docs/changelog.md`). Elle reste simple et volontairement évolutive : chaque phase pourra être ajustée en fonction de ce qui est appris pendant les phases précédentes.

## Phases

| Phase | Contenu | Statut |
|---|---|---|
| V0.1 | Refonte graphique globale (sidebar, tableau de bord modernisé, charte indigo/violet) | Validée |
| V0.1.1 | Corrections ciblées du tableau de bord (agenda, to-do, alertes, sélecteur de date) | Validée |
| V0.1.2 | Structuration technique : Git, GitHub, roadmap, backlog, versioning | Validée |
| V0.2 | Navigation et architecture générale | Validée |
| V0.3 | Tableau de bord : hub de navigation et interactions de base | Validée |
| V0.4.1 | Liste clients CRM : recherche, filtre par statut, accès fiche client | Validée |
| V0.4.2 | Fiche client CRM complète, visuelle et ergonomique | Validée |
| V0.4.2.1 | Ajustements UX de la fiche client (correction intégrée à la V0.4.2 avant sa validation finale) | Validée |
| V0.4.3 | Interactions CRM préparatoires : modales placeholder (statut client, personnalisation des statuts, notes commerciales) | Validée |
| V0.4.3.1 | Ajustements de parcours (retour contextuel Agenda/Facturation, statut cliquable) | Validée |
| V0.5.1 | Catalogue Produits / Services : recherche, filtres type/statut, accès fiche produit/service | Validée |
| V0.5.2 | Fiche Produit / Service complète (en-tête, résumé commercial, description commerciale, paramètres de vente, utilisation future en facturation, note interne, historique de l'offre) | Validée |
| V0.5.3 | Interactions préparatoires Produits / Services : modales placeholder (ajout, statut, type, paramètres de vente, marge, note interne, historique complet) | Validée |
| V0.5.3.1 | Correction UX/produit de la V0.5.3 (bloc Coûts & marge remplaçant "Utilisation future en facturation", historique enrichi, badge Type cliquable, modifications bloc par bloc, contraste) | Validée |
| V0.5.4 | Pagination & listes génériques : pagination Précédent/Suivant + sélecteur 5/10/25 sur Clients et Produits/Services, helper `COCKPIT_LIST_PAGINATION` réutilisable | Validée |
| V0.6.1 | Paramètres entreprise & Module Devis : formulaire émetteur, liste de devis, éditeur "document vivant" (client, lignes, calculs HT/TVA/TTC/remise, versionnement, verrouillage) | Validée |
| V0.6.2 | Module Factures & Paiements : liste de factures, éditeur de facture (brouillon/émission/verrouillage), conversion devis → facture, suivi des paiements et statuts calculés | Validée |
| V0.6.3 | Documents PDF / Impression : pages document dédiées pour devis et factures, impression navigateur (CSS print + `window.print()`), sans bibliothèque externe | Validée |
| V0.6.4 | Intégration commerciale : devis/factures liés dans la fiche client, aperçu Facturation au dashboard, statistiques commerciales sur `facturation.html`, navigation croisée client ↔ devis/facture | Validée |
| V0.7 | Agenda commercial : rendez-vous, préparation commerciale, communication client, devis brouillon lié, historique, export PDF, aperçu au dashboard | Validée |
| V0.7.1 | Vues calendrier Jour/Semaine/Mois et enrichissements du module Agenda (formulaire de rendez-vous en sections, recherche client, proposition commerciale, navigation temporelle fiable) | Validée |
| V0.8 | Module Trésorerie : solde estimé, à encaisser/à décaisser, prochains mouvements, charges prévues, factures à encaisser, projection et alertes | Validée |
| V0.9 | Analyses et performance (renommage du module Finance) : cockpit d'analyse transversal recoupant Facturation/Clients/Agenda/Trésorerie | Validée |
| V0.9.1 | Refonte visuelle du module Analyses (donuts, tunnel de conversion, cartes de synthèse), sans changement fonctionnel | Validée |
| V0.9.2 | Configuration personnalisable de démonstration (`js/demo-config.js`) : identité fictive centralisée, connectée aux éléments les plus visibles pendant une démo | Validée |
| V0.10.1 | Cohérence globale UI/UX : harmonisation de composants communs, corrections responsive minimales, nettoyage documentaire, sans nouveau module ni changement métier | En attente de validation visuelle |
| V0.10.2 | Refonte structurelle du tableau de bord | À venir |
| V1 | Version fonctionnelle stable | À venir |

## Principes

- Chaque phase validée fait l'objet d'un commit clair et, si elle marque une étape importante, d'un tag Git (voir `docs/versioning.md`).
- L'ordre des phases V0.4 à V0.9 pourra être réévalué selon les priorités du chef de projet — cette roadmap n'est pas un engagement contractuel, mais un fil conducteur.
- Les idées qui ne rentrent pas dans la phase en cours sont conservées dans `docs/backlog.md` plutôt que d'être perdues ou traitées hors périmètre.

## Précision importante — V0.2 vs V0.8 / V0.9

La V0.2 ajoute Trésorerie, Produits / Services et Finance dans la navigation principale, sous forme de **pages placeholder** (portes d'entrée visuelles cohérentes avec la charte V0.1.1, sans logique métier). Cela ne signifie pas que ces modules sont fonctionnels dès la V0.2.

Les phases dédiées à leur **développement fonctionnel réel** (calculs, données réelles, création/modification, etc.) sont, après le réordonnancement décrit plus bas : V0.5 pour Produits / Services, V0.8 pour Trésorerie, V0.9 pour Finance (devenu Analyses). La V0.2 pose uniquement la structure de navigation ; ces phases ultérieures y ajoutent la logique métier.

Le module **Statistiques / Pilotage** n'est volontairement pas ajouté à la sidebar en V0.2 (voir `docs/backlog.md`) : il sera étudié plus tard, une fois la distinction entre Finance, Trésorerie et indicateurs de pilotage plus claire.

## Précision importante — découpage de la V0.4

La V0.4 (Clients / fiche client / socle CRM) est découpée en trois sous-versions plutôt que traitée en un seul bloc, la fiche client étant centrale pour construire un vrai CRM : **V0.4.1** pose la liste Clients améliorée (recherche, filtre, accès à la fiche) ; **V0.4.2** construit la fiche client complète (historique, rendez-vous, devis, factures, notes) ; **V0.4.3** ajoute des interactions préparatoires sous forme de modales placeholder (changement de statut, personnalisation des statuts, gestion des notes) — aucune de ces actions ne modifie durablement les données ; la vraie logique (persistance, CRUD réel) reste à construire dans une phase ultérieure.

## Précision importante — réordonnancement V0.5 à V0.10

L'ordre initial des phases après la V0.4 (Agenda en V0.5, Facturation en V0.6, Trésorerie en V0.7, Produits/Services en V0.8, Finance en V0.9) a été révisé par le chef de projet : **Produits / Services passe désormais en V0.5**, avant Facturation, Trésorerie et Agenda, car il constitue le référentiel de ce que l'entreprise vend — les produits et services alimenteront plus tard les lignes de devis et factures, il est donc logique de le construire avant le module Facturation. L'ordre devient : V0.5 Produits/Services, V0.6 Facturation, V0.7 Trésorerie, V0.8 Agenda, V0.9 Finance/Pilotage avancé, V0.10 Cohérence globale des parcours/Dashboard. Comme précisé au principe général de cette roadmap, cet ordre reste indicatif et pourra être réévalué selon les priorités du chef de projet.

## Précision importante — découpage de la V0.5

Comme pour la V0.4, la V0.5 (Produits / Services) est découpée en sous-versions plutôt que traitée en un seul bloc : **V0.5.1** construit le catalogue Produits / Services (recherche, filtres type/statut, compteur, accès à une fiche produit/service placeholder) sur le même principe que la V0.4.1 pour les clients ; **V0.5.2** construit la fiche produit/service complète (en-tête, résumé commercial, description commerciale, paramètres de vente, utilisation future en facturation, note interne, historique de l'offre) sur le même principe que la V0.4.2 pour la fiche client — données statiques, aucune interaction réelle ; **V0.5.3** ajoute des interactions préparatoires sous forme de modales placeholder (ajout, modification de l'offre, changement de statut, modalités de paiement, détail de marge à venir, note interne, historique complet) sur le même principe que la V0.4.3 pour la fiche client — aucune de ces actions ne modifie durablement les données ; la vraie logique (persistance, CRUD réel, intégration à la Facturation) reste à construire dans une phase ultérieure.

## Précision importante — V0.5.4, une version transversale avant la V0.6

Contrairement aux autres sous-versions de la V0.5, la **V0.5.4** n'ajoute rien de spécifique au module Produits / Services : c'est une amélioration transversale des listes déjà existantes (Clients et Produits / Services), insérée avant la V0.6 Facturation pour poser un pattern de pagination réutilisable (`window.COCKPIT_LIST_PAGINATION`) avant que de nouvelles listes (Devis, Factures) ne soient créées. Elle reste numérotée V0.5.4 plutôt que V0.6 car elle prolonge le travail déjà engagé sur les listes du catalogue et des clients, sans construire de nouveau module.

## Précision importante — découpage de la V0.6

Comme pour la V0.4 et la V0.5, la V0.6 (Facturation) est découpée en sous-versions plutôt que traitée en un seul bloc : **V0.6.1** pose les Paramètres entreprise (émetteur des futurs documents) et construit le module Devis complet (liste, création, consultation, modification, duplication, versionnement, verrouillage) — `pages/facturation.html` devient la vraie liste des devis, avec des onglets "Devis"/"Factures" préparant explicitement la suite sans construire les factures à l'avance. **V0.6.2** active l'onglet "Factures" : liste, éditeur `pages/facture-edition.html` (brouillon éditable puis émission verrouillant la facture), conversion d'un devis Accepté en facture, et suivi des paiements (paiements partiels, reste à payer, statut calculé, retard). **V0.6.3** ajoute la préparation documentaire des devis et factures déjà construits : pages document dédiées (`pages/devis-document.html`, `pages/facture-document.html`), impression navigateur avec un CSS d'impression dédié plutôt qu'une bibliothèque PDF externe. **V0.6.4** ne construit aucun nouveau module, mais intègre les modules Devis/Factures déjà construits dans le reste de l'application : fiche client (documents réellement liés), tableau de bord (aperçu Facturation compact), statistiques commerciales simples (`facturation.html`) et navigation croisée client ↔ devis/facture. Comme pour les versions précédentes, aucune persistance réelle n'est introduite avant que le projet ait une vraie source de données ; le versionnement/verrouillage des devis et l'émission/les paiements des factures sont démontrés sur un jeu de données fictif pré-écrit, complété par des actions réelles en mémoire de page (nouvelle version de devis depuis le correctif V0.6.1, émission et paiements de facture en V0.6.2).

## Précision importante — réordonnancement V0.7 : Agenda commercial avant Trésorerie

L'ordre fixé par la précision précédente (V0.7 Trésorerie, V0.8 Agenda) a été révisé une nouvelle fois par le chef de projet : **l'Agenda commercial passe en V0.7**, avant Trésorerie et Finance, car il complète directement le parcours commercial déjà construit en V0.6 (Facturation) — un rendez-vous commercial y génère un devis brouillon lié, qui peut devenir un devis classique puis une facture, prolongeant ainsi le même fil (Client → Rendez-vous → Devis → Facture) sans dépendre des modules Trésorerie ou Finance. L'ordre devient : V0.7 Agenda commercial, V0.8 Trésorerie, V0.9 Finance/Pilotage avancé, V0.10 Cohérence globale des parcours/Dashboard. Comme précisé au principe général de cette roadmap, cet ordre reste indicatif.

**V0.7** construit le module Agenda commercial : liste de rendez-vous avec filtres (`pages/agenda.html`), fiche de rendez-vous complète avec préparation commerciale, communication client, historique et devis brouillon lié (`pages/fiche-rdv.html`), export PDF de la fiche de préparation (`pages/rdv-document.html`), et un bloc "Agenda commercial" réel au tableau de bord. Le lien fort avec la Facturation (V0.6) est la règle "un rendez-vous = un devis brouillon lié" : ce devis brouillon peut être supprimé (si le rendez-vous n'aboutit à rien, sous des conditions strictes évitant toute suppression générale de devis) ou transformé en devis classique, puis suivre le parcours normal jusqu'à la facture. Comme pour toutes les versions précédentes, aucune persistance réelle n'est introduite : la création d'un rendez-vous et de son devis brouillon lié sont des actions réelles en mémoire de page.

**V0.7.1** enrichit le module Agenda livré en V0.7, sans en changer le périmètre : remplace la vue liste seule par de vraies vues calendrier Jour/Semaine/Mois (positionnement horaire, navigation Précédent/Aujourd'hui/Suivant, sélecteurs semaine/mois + année), réorganise le formulaire de rendez-vous en sections claires (informations, client, proposition commerciale, notes) avec recherche client "contient" et proposition commerciale (produits du catalogue, remise, calcul HT/TVA/TTC réutilisant les helpers de la Facturation), et corrige plusieurs points d'ergonomie remontés en revue humaine (cohérence TVA, déversement de la proposition commerciale vers le devis brouillon lié, style des champs, fiabilité de la saisie de date).

**V0.8** construit le module Trésorerie (`pages/tresorerie.html`), jusque-là un simple placeholder depuis la V0.2 : 4 cartes KPI (solde estimé, à encaisser, à décaisser, solde prévisionnel), calculées depuis les factures/paiements réels de la Facturation et des opérations de trésorerie manuelles (charges prévues, encaissements/décaissements divers) ; bloc "Prochains mouvements" (timeline), tableaux "Charges prévues" et "Factures à encaisser", graphique de projection du solde et bloc d'alertes. Volontairement simple : pas de comptabilité complète, pas de rapprochement bancaire.

**V0.9** renomme le module Finance (placeholder depuis la V0.2) en **Analyses** et en fait un cockpit d'analyse transversal (`pages/analyses.html`) plutôt qu'un module de comptabilité : cinq onglets (Vue d'ensemble, Commercial, Clients, Activité, Trésorerie) qui recoupent les données déjà construites dans les modules Facturation, Clients, Agenda et Trésorerie, sans dupliquer leurs calculs. La V0.9.1 (voir `docs/changelog.md`) affine ensuite le rendu visuel de ce module (donuts, tunnel de conversion, cartes de synthèse), sans changement fonctionnel.

## Précision importante — V0.10 scindée en V0.10.1 et V0.10.2

La phase V0.10 "Cohérence globale des parcours/Dashboard" annoncée dans les précisions précédentes est scindée en deux : **V0.10.1** traite la cohérence transversale UI/UX de l'ensemble des pages déjà construites (structure, composants communs, responsive minimal, documentation) sans toucher au tableau de bord au-delà de petites incohérences visuelles évidentes ; **V0.10.2** (à venir) traitera spécifiquement la refonte structurelle du tableau de bord, explicitement hors périmètre de la V0.10.1 pour ne pas mélanger un ajustement transversal léger avec une refonte de module plus lourde. Voir `docs/changelog.md` pour le détail des constats et corrections de la V0.10.1.
