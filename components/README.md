# Dossier components

## Rôle
Ce dossier contient les éléments réutilisables de l'interface : boutons, cartes, tableaux, formulaires, fenêtres modales.

## Organisation
- `buttons/` — boutons réutilisables.
- `cards/` — cartes réutilisables (KPI, alertes, indicateurs, etc.).
- `tables/` — tableaux de données réutilisables.
- `forms/` — champs et formulaires réutilisables.
- `modals/` — fenêtres modales réutilisables, dont le futur pop-up "Work in progress".

## Ce qui ne doit pas être rangé ici
- Le contenu spécifique à une page (réservé au dossier `pages/`).

## Règles pour les futures modifications
Un même type de composant (par exemple un bouton principal) ne doit être développé qu'une seule fois ici, puis réutilisé par toutes les pages qui en ont besoin. Un module ne doit jamais recréer un composant déjà existant.
