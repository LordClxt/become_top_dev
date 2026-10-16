## Hint 1
`keyof typeof PERMISSIONS` donne les rôles. Pour les permissions d'un rôle, l'accès indexé `(typeof PERMISSIONS)[R]` donne un tuple ; `[number]` à la suite donne l'union de ses éléments.

## Hint 2
`Shared<A, B>` est littéralement `PermissionOf<A> & PermissionOf<B>` : l'intersection d'unions de littéraux garde les littéraux communs. À l'exécution, `PERMISSIONS[role]` est un tuple `readonly` : pour y chercher une `Permission`, annote d'abord une variable `readonly Permission[]`.

## Hint 3
`filter` avec une garde (`(p): p is Permission => …`) conserve le type du tableau. `minimumRole` : parcours un tableau ordonné des rôles et prends le premier pour lequel `can(role, permission)` est vrai.
