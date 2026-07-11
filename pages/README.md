# Dossier pages

## Rôle
Ce dossier contient les pages du prototype. Il a beaucoup grandi depuis la V0 initiale (login, dashboard, clients, agenda, facturation, database, settings) : modules Clients/CRM, Produits/Services, Facturation (devis/factures/documents imprimables), Agenda commercial (liste, calendrier, fiche rendez-vous), Trésorerie et Analyses s'y sont ajoutés au fil des versions. Pour la liste à jour et le détail de chaque page, voir le `README.md` principal du projet (section "Ce qui a été livré") — ce fichier ne maintient plus une liste exhaustive pour éviter la duplication.

Toutes ces pages (sauf `login.html`) partagent la même barre latérale de navigation. Les boutons non encore fonctionnels affichent le pop-up "Work in progress" (géré depuis `js/app.js`). Les données affichées restent fictives, sans persistance réelle au-delà de la mémoire de la page courante — voir le `README.md` principal pour le détail des limites de la V0.

## Ce qui ne doit pas être rangé ici
- Les composants réutilisables (réservés au dossier `components/`).
- Les ressources graphiques (réservées au dossier `assets/`).

## Règles pour les futures modifications
Chaque page devra respecter la même identité visuelle et les mêmes composants que les autres, conformément à la charte de conception.
