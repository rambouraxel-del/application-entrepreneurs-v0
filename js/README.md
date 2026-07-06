# Dossier js

## Rôle
Ce dossier contient les fichiers liés aux futures interactions de l'application : navigation, clics, fenêtres pop-up, comportements visuels.

## Ce qui doit être rangé ici
- Les scripts JavaScript de l'application.
- La redirection du bouton "Se connecter" vers le tableau de bord.
- La logique centralisée du pop-up "Work in progress" (génération dynamique, ouverture/fermeture, détection des éléments `.btn-wip`).

La navigation entre les pages principales ne nécessite pas de JavaScript : elle repose sur de simples liens HTML (voir `pages/README.md`).

## Ce qui ne doit pas être rangé ici
- Du style visuel (réservé au dossier `css/`).
- De la logique métier réelle (hors périmètre de la V0, qui reste un prototype visuel).

## Règles pour les futures modifications
Un même comportement (par exemple le pop-up "Work in progress") doit être écrit une seule fois et réutilisé partout, conformément au principe de non-duplication du projet.
