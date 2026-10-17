## Contexte

Quatre usages des types littéraux de gabarit : des attributs `data-*`, la conversion `snake_case` → `camelCase` (types et exécution), et l'extraction des paramètres d'une route.

Tu édites `strings.ts`.

## À faire

1. `Attributes` : `id?: string`, `role?: string`, et n'importe quelle clé `data-…` de type `string | number`.
2. `ToCamel<S>` (récursif) et `ObjectToCamel<T>` ; `toCamel(s)` et `objectToCamel(obj)` font la même chose à l'exécution.
3. `RouteParams<P>` : `'/users/:id/posts/:postId'` → `{ id: string; postId: string }` ; sans paramètre → `{}`.
4. `matchRoute(pattern, path)` : `RouteParams<P>` si le chemin correspond au motif (même nombre de segments, segments fixes égaux), sinon `null`.

## Contraintes

Pas de `any`. Une assertion justifiée autorisée dans `objectToCamel` et une dans `matchRoute`.
