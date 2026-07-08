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
| V0.6.1 | Paramètres entreprise & Module Devis : formulaire émetteur, liste de devis, éditeur "document vivant" (client, lignes, calculs HT/TVA/TTC/remise, versionnement, verrouillage) | En cours |
| V0.6.2 | Factures (à cadrer) | À venir |
| V0.7 | Page Trésorerie | À venir |
| V0.8 | Page Agenda | À venir |
| V0.9 | Finance / Pilotage avancé | À venir |
| V0.10 | Cohérence globale des parcours / Dashboard | À venir |
| V1 | Version fonctionnelle stable | À venir |

## Principes

- Chaque phase validée fait l'objet d'un commit clair et, si elle marque une étape importante, d'un tag Git (voir `docs/versioning.md`).
- L'ordre des phases V0.4 à V0.9 pourra être réévalué selon les priorités du chef de projet — cette roadmap n'est pas un engagement contractuel, mais un fil conducteur.
- Les idées qui ne rentrent pas dans la phase en cours sont conservées dans `docs/backlog.md` plutôt que d'être perdues ou traitées hors périmètre.

## Précision importante — V0.2 vs V0.7 / V0.8 / V0.9

La V0.2 ajoute Trésorerie, Produits / Services et Finance dans la navigation principale, sous forme de **pages placeholder** (portes d'entrée visuelles cohérentes avec la charte V0.1.1, sans logique métier). Cela ne signifie pas que ces modules sont fonctionnels dès la V0.2.

Les phases V0.7 (Trésorerie), V0.8 (Produits / Services) et V0.9 (Finance) restent celles dédiées à leur **développement fonctionnel réel** (calculs, données réelles, création/modification, etc.). La V0.2 pose uniquement la structure de navigation ; ces phases ultérieures y ajouteront la logique métier.

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

Comme pour la V0.4 et la V0.5, la V0.6 (Facturation) est découpée en sous-versions plutôt que traitée en un seul bloc : **V0.6.1** pose les Paramètres entreprise (émetteur des futurs documents) et construit le module Devis complet (liste, création, consultation, modification, duplication, versionnement, verrouillage) — `pages/facturation.html` devient la vraie liste des devis, avec des onglets "Devis"/"Factures" préparant explicitement la suite sans construire les factures à l'avance. **V0.6.2** (non encore cadrée) ajoutera les factures, probablement avec conversion depuis un devis accepté. Comme pour les versions précédentes, aucune persistance réelle n'est introduite avant que le projet ait une vraie source de données ; le versionnement et le verrouillage des devis sont démontrés sur un jeu de données fictif pré-écrit.
