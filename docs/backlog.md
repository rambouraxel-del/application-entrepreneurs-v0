# Backlog produit

## Après la V0.11

- Backend et synchronisation multi-appareil de la configuration.
- Authentification réelle, mot de passe, double authentification, rôles, permissions, sessions et appareils.
- Notifications e-mail, push et SMS.
- Upload et stockage sécurisé du logo et des documents.
- Numérotation des devis/factures persistante et sûre en concurrence.
- Persistance réelle des Clients, Produits, Rendez-vous, Devis, Factures, Paiements et opérations de Trésorerie.
- Champs Clients personnalisés appliqués au modèle de données.
- Unités et familles Produits/Services réellement intégrées.
- Formats de date, fuseaux horaires, langue et premier jour de semaine configurables.
- Comparaison complète avec la période précédente et seuil uniforme des constats automatiques dans Analyses.
- Modèles de documents avancés, avoirs et génération PDF serveur.

## Points volontairement limités dans la V0

- Les créations et modifications métier restent en mémoire de page.
- Les réglages de documents s'appliquent aux nouveaux documents seulement ; les snapshots historiques sont conservés.
- La numérotation reste indicative.
- Les fonctions de compte et de notification externe ne sont pas simulées.
- La configuration locale n'est ni une sauvegarde cloud ni un stockage sécurisé.

## V0.12

Conserver dans la revue humaine globale tous les constats de cohérence UI/UX, responsive, lisibilité, navigation, états vides et messages d'erreur découverts pendant la validation de la V0.11.

Réalisé lors de l'assainissement V0.12 (voir `docs/decisions.md`) : réparation de `settings-consumers.js`, documentation à jour, suppression des fichiers inutiles (`database.html`, `assets/`, `components/`, `settings-finalize.js`), fusion en un seul moteur d'alertes Dashboard, correctifs Agenda/pagination/date, retrait du compteur de notifications factice, commande de tests unifiée.

Reporté à une itération ultérieure (hors périmètre explicite de cette version) : découpage de `app.js` (piste documentée dans `docs/architecture-app-js.md`), factorisation de la duplication assumée entre devis-édition/facture-édition et des helpers `makeEl`/`formatDateFr` répétés par page.
