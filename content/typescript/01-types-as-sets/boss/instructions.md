## Contexte

Les permissions d'une application sont des **ensembles** : chaque rôle en a un, certains sont inclus dans d'autres. Tu modélises tout à partir d'une constante `PERMISSIONS`, avec les opérations d'ensembles (union, intersection, différence) **à la fois dans les types et à l'exécution**, et les tests de types vérifient que les deux mondes disent la même chose.

Tu édites `access.ts`.

## À faire

1. Types déduits de `PERMISSIONS` : `Role`, `PermissionOf<R>` (permissions d'un rôle précis), `Permission` (l'union de toutes), `Shared<A, B>` (permissions communes à deux rôles : l'**intersection** des deux types).
2. `permissionsOf(role)` renvoie les permissions du rôle avec le **type précis** de ce rôle.
3. `can(role, permission)`, `minimumRole(permission)` (ordre `viewer` < `editor` < `admin`), `sharedPermissions(a, b)` (intersection, dans l'ordre de `a`), `missingPermissions(role)` (différence avec l'ensemble complet, dans l'ordre de `admin`).

## Contraintes

Pas de `any`. Les types ne sont jamais recopiés : ils découlent de la constante. Une garde de type ou une annotation vaut mieux qu'une assertion.
