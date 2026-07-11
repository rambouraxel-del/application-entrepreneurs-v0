# Dossier pages

## Rôle
Ce dossier contient les pages du prototype : connexion, Dashboard, Clients, Agenda, Facturation, Trésorerie, Produits/Services, Analyses et pages détaillées associées.

`settings.html` est, depuis la V0.11, le Centre de paramètres central. Il propose une navigation secondaire, une recherche transverse, une sauvegarde par section, l'import/export JSON et les états honnêtes des fonctions indisponibles. L'ancienne URL `parametres-entreprise.html` redirige vers `settings.html#company` afin d'éviter deux sources de vérité.

Toutes les pages post-connexion chargent `demo-config.js` avant `app.js`. Ce point d'entrée initialise le store de configuration et les adaptateurs sans dupliquer les scripts dans chaque page.

## Règles
- Conserver la même sidebar, la même topbar et la même identité visuelle.
- Ne pas dupliquer un formulaire de réglage déjà présent dans le Centre de paramètres.
- Les contrôles temporaires d'une page métier restent utilisables, mais les valeurs persistantes par défaut viennent du store central.
- Les fonctions nécessitant un backend doivent être indiquées comme indisponibles, jamais simulées.
