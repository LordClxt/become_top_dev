## Contexte

Une table de routes HTTP et quelques constantes. Le code compile, mais ses types sont **élargis** : `HttpMethod` vaut `string`, les noms de routes aussi, et une faute de frappe (`routes.hmoe`) passe inaperçue. Tu ajoutes les bons leviers (`as const`, `satisfies`, un helper de tuple) pour garder des types précis **sans les recopier**.

Tu édites `routes.ts`.

## À faire

1. `METHODS` : la liste des méthodes en tuple de littéraux ; `HttpMethod` est dérivé du tableau (`'GET' | 'POST' | 'PUT' | 'DELETE'`). `isMethod(s)` est un garde de type.
2. `routes` : chaque entrée respecte `Route`, mais `RouteName` (les clés de `routes`) vaut exactement `'home' | 'createUser' | 'deleteUser'` — utilise `satisfies`.
3. `tuple(...elements)` renvoie ses arguments avec un **type tuple** (`tuple(1, 'a')` : `[number, string]`).
4. `findRoute(method, path)` renvoie le nom de la route correspondante, ou `undefined`.

## Contraintes

Aucune union recopiée à la main : tout se dérive des valeurs.
