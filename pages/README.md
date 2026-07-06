# Dossier pages

## Rôle
Ce dossier contient les pages principales de la V0 du prototype.

## Contenu actuel
- `login.html` — page de connexion fictive (champs e-mail/mot de passe, bouton "Se connecter" fonctionnel, lien "Mot de passe oublié ?").
- `dashboard.html` — tableau de bord enrichi (KPI, priorité du jour, agenda du jour, to-do list, alertes, notifications, indicateurs favoris) avec données fictives.
- `clients.html` — page Clients (bouton fictif, barre de recherche fictive, tableau de clients fictifs).
- `agenda.html` — page Agenda (bouton fictif, liste de rendez-vous fictifs).
- `facturation.html` — page Facturation (boutons fictifs, tableau de devis/factures fictifs avec statuts).
- `database.html` — page Base de données (cartes des bases centrales avec compteurs fictifs).
- `settings.html` — page Paramètres (sections fictives avec boutons "Modifier").

Toutes ces pages (sauf `login.html`) partagent la même barre d'onglets de navigation. Tous les boutons non fonctionnels affichent le pop-up "Work in progress" (géré depuis `js/app.js`). Les données affichées sont entièrement fictives — voir le `README.md` principal pour le détail des limites de la V0.

## Ce qui ne doit pas être rangé ici
- Les composants réutilisables (réservés au dossier `components/`).
- Les ressources graphiques (réservées au dossier `assets/`).

## Règles pour les futures modifications
Chaque page devra respecter la même identité visuelle et les mêmes composants que les autres, conformément à la charte de conception.
