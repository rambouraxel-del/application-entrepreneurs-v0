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
| V0.4.2 | Fiche client CRM complète, visuelle et ergonomique | En cours |
| V0.4.2.1 | Ajustements UX de la fiche client (correction intégrée à la V0.4.2 avant sa validation finale) | En cours |
| V0.4.3 | Statuts personnalisables + premières interactions CRM simples | À venir |
| V0.5 | Page Agenda | À venir |
| V0.6 | Page Facturation | À venir |
| V0.7 | Page Trésorerie | À venir |
| V0.8 | Produits / Services | À venir |
| V0.9 | Finance | À venir |
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

La V0.4 (Clients / fiche client / socle CRM) est découpée en trois sous-versions plutôt que traitée en un seul bloc, la fiche client étant centrale pour construire un vrai CRM : **V0.4.1** pose la liste Clients améliorée (recherche, filtre, accès à la fiche) ; **V0.4.2** construira la fiche client complète (historique, rendez-vous, devis, factures, notes, relances) ; **V0.4.3** ajoutera la personnalisation des statuts et de premières interactions CRM simples.
