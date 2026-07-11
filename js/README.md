# Dossier js

## Rôle
Ce dossier contient toute la logique JavaScript de l'application : interactions (navigation, clics, pop-up), mais aussi — depuis la V0.4 — les données de démonstration et les calculs métier réels des modules (Clients, Produits/Services, Devis/Factures, Agenda, Trésorerie, Analyses), le tout dans un unique `app.js` organisé en IIFE indépendantes.

## Ce qui doit être rangé ici
- Les scripts JavaScript de l'application, y compris les données fictives en mémoire (`CLIENT_DETAILS`, `DEVIS_DETAILS`, `FACTURE_DETAILS`, `RDV_DETAILS`, `TRESORERIE_OPERATIONS`...) et leurs helpers de calcul associés (`window.COCKPIT_*`), aucun n'ayant de persistance réelle au-delà de la mémoire de la page courante.
- La logique centralisée du pop-up "Work in progress" (génération dynamique, ouverture/fermeture, détection des éléments `.btn-wip`) et du moteur de modale générique (`window.COCKPIT_MODAL`).

La navigation entre les pages principales ne nécessite pas de JavaScript : elle repose sur de simples liens HTML (voir `pages/README.md`).

## Ce qui ne doit pas être rangé ici
- Du style visuel (réservé au dossier `css/`).
- Un vrai backend, une authentification ou une persistance réelle (hors périmètre de la V0, qui reste un prototype cliquable sur données fictives).

## Règles pour les futures modifications
Un même comportement (par exemple le pop-up "Work in progress") doit être écrit une seule fois et réutilisé partout, conformément au principe de non-duplication du projet.
