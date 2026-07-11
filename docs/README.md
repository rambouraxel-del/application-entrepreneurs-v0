# Dossier docs

## Rôle
Ce dossier contient la documentation interne du projet : suivi des évolutions et décisions importantes prises pendant le développement.

## Contenu
- `changelog.md` — résumé des grandes étapes réalisées, version par version.
- `decisions.md` — trace des décisions importantes prises pendant le développement.
- `roadmap-v0bis.md` — phases prévues après la V0 initiale, avec leur statut (Validée / En cours / À venir).
- `backlog.md` — idées et limites connues, classées par module, non traitées dans la version en cours.
- `versioning.md` — convention de nommage des versions et règles de commit/tag/branche.
- `settings-v0.11.md` — architecture et checklist du Centre de paramètres.
- `architecture-app-js.md` — cartographie de `js/app.js` et piste de découpage pour la V1.
- `archive/` — documents de revue clôturés (pré-V0.11, V0.11), conservés pour traçabilité mais non tenus à jour ; ne pas s'y référer pour l'état courant du projet.

## Ce qui ne doit pas être rangé ici
- La documentation destinée à l'utilisateur final (réservée au `README.md` principal du projet).

## Personnaliser la démo pour un prospect (V0.9.2)

Le fichier `js/demo-config.js` (chargé avant `js/app.js` sur chaque page) centralise l'identité fictive utilisée pendant une démonstration : `prenom`, `nom`, `fonction`, `entreprise`, `activite`, `ville`, `email`, `telephone`, `objectifMensuel`.

Pour adapter la démo à un prospect, modifier uniquement l'objet `DEMO_CONFIG` en tête de ce fichier — aucun autre fichier n'a besoin d'être touché. Les éléments connectés à cette configuration sont :

- la salutation et le sous-titre du tableau de bord (`pages/dashboard.html`) ;
- la légende "Objectif mensuel" du tableau de bord et de `pages/settings.html` ;
- la carte "Compte utilisateur" de `pages/settings.html` (nom, fonction, e-mail) ;
- le nom, le téléphone et l'e-mail de l'émetteur (`window.COCKPIT_COMPANY_SETTINGS`), donc `pages/parametres-entreprise.html` et tous les devis/factures/documents imprimables.

Chaque champ a une valeur par défaut fictive si `DEMO_CONFIG` est incomplet (voir les `DEFAULTS` du fichier). Le reste des données de démonstration (clients, produits/services, devis, factures, rendez-vous, opérations de trésorerie...) n'est pas concerné par ce fichier et reste à modifier directement dans `js/app.js` si besoin.
