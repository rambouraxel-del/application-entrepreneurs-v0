# Règles de versioning

## Nommage

- **V0.x** : phase majeure du prototype.
- **V0.x.x** : sous-version planifiée ou correction ciblée.
- **V1** : première version stable avec données persistantes, backend et authentification.

## Commits

Un commit doit correspondre à une intention claire et testable. Les commits de correction de la V0.11 sont réalisés sur `v0.11-settings-center`, jamais directement sur `main`.

## Tags

Un tag marque uniquement une version validée. Aucun tag `v0.11` ne doit être créé tant que la recette humaine finale n'est pas approuvée.

## Branches

- `main` contient la dernière version validée, actuellement V0.10.2.
- `v0.11-settings-center` contient la V0.11 en revue humaine.
- Une branche en avance sur `main`, non fusionnée, reste une version en chantier même si ses commits sont propres.

## Validation de la V0.11

Ordre obligatoire :

1. développement et tests sur la branche dédiée ;
2. recette humaine finale ;
3. corrections éventuelles ;
4. validation explicite du chef de projet ;
5. merge dans `main` ;
6. création éventuelle du tag `v0.11`.

La persistance locale de configuration ne transforme pas la V0 en V1 : les données métier restent non persistantes.
