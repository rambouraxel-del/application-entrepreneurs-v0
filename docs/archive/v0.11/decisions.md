# Décisions V0.11

- Architecture hybride avec un schéma central et des adaptateurs, plutôt qu'une réécriture complète de `app.js`.
- `localStorage` limité à la configuration ; aucune donnée métier ni donnée sensible.
- Import strict : propriétés inconnues refusées, valeurs manquantes complétées par les valeurs par défaut.
- Profil utilisateur, identité d'entreprise et profil de démonstration restent trois concepts distincts.
- Désactivation privilégiée à la suppression pour les référentiels déjà utilisés.
- Snapshots documentaires historiques immuables ; application des réglages aux nouveaux documents uniquement.
- Numérotation configurable explicitement indicative tant qu'aucun backend n'alloue une séquence persistante.
- Aucune simulation de mot de passe, 2FA, sessions, permissions, e-mail, push ou SMS.
