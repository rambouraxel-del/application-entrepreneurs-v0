# Règles de versioning

Ce document explique simplement comment le projet suit ses versions avec Git. L'objectif est de rester lisible et pratique, pas de mettre en place une organisation complexe.

## Nommage des versions

- **V0** : le prototype visuel cliquable initial (étapes 0 à 10, voir `docs/changelog.md`).
- **V0.x** (ex. V0.1, V0.2...) : une phase majeure du projet, qui correspond en général à une entrée de la roadmap (`docs/roadmap-v0bis.md`) — une refonte graphique, l'ajout d'un module, etc.
- **V0.x.x** (ex. V0.1.1, V0.1.2...) : une correction ou un ajustement ciblé à l'intérieur d'une phase majeure, qui ne change pas son périmètre global (correction visuelle, structuration technique, petit correctif).
- **V1** : la première version fonctionnelle stable, une fois que les modules principaux reposent sur de vraies fonctionnalités (données réelles, sauvegarde, authentification).

## Quand créer un commit

- Un commit est créé à chaque étape ou correction validée par le chef de projet — pas à chaque petite modification intermédiaire.
- Le message de commit reprend le numéro de version et une courte description, par exemple :
  - `v0.1.1 - refonte graphique stabilisée`
  - `v0.1.2 - structuration technique et documentation projet`

## Quand créer un tag

- Un tag est créé pour marquer une version validée qui représente une étape de référence claire (par exemple la fin d'une phase majeure comme V0.1, ou une correction importante comme V0.1.1).
- Le tag porte le même nom que la version, par exemple `v0.1.1`.
- Toutes les corrections mineures n'ont pas nécessairement besoin d'un tag — un commit clair suffit dans ce cas. Le tag est réservé aux moments où l'on veut pouvoir revenir précisément à cet état plus tard.

## Branches

- `main` contient uniquement les versions validées par le chef de projet — pas de travail en cours instable.
- Si une phase nécessite plusieurs étapes intermédiaires ou des essais, elle peut être développée sur une branche dédiée (par exemple `v0.2-navigation`), puis fusionnée dans `main` une fois validée.
- Pour l'instant, tant que chaque phase est validée avant de passer à la suivante (comme c'est le cas depuis le début du projet), tout peut continuer à se faire directement sur `main` : les branches ne sont utiles qu'à partir du moment où plusieurs pistes sont explorées en parallèle.

## Distinguer une version validée d'une version en chantier

- Une version **validée** = un commit sur `main`, avec un message de version clair, éventuellement un tag.
- Une version **en chantier** = soit des modifications non encore committées, soit des commits sur une branche dédiée non encore fusionnée dans `main`.
- Le fichier `docs/changelog.md` fait référence pour savoir ce qui a été réalisé et validé à chaque étape ; `docs/roadmap-v0bis.md` indique ce qui est prévu ensuite.
