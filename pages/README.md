# Dossier pages

`settings.html` est l'unique Centre de paramètres. L'ancienne page `parametres-entreprise.html` redirige vers sa section Entreprise.

Les pages post-connexion chargent `demo-config.js` avant `app.js`. Ce chargeur initialise le store, les préférences globales et les adaptateurs, sans dupliquer les scripts dans chaque page.

Les contrôles de page restent utilisables pendant la session ; leurs valeurs persistantes par défaut proviennent du Centre de paramètres lorsqu'elles sont compatibles avec la V0. Les fonctions nécessitant un backend sont affichées comme réservées à la V1.
