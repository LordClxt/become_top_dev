## Contexte

Un générateur de requêtes de recherche et de fiches de contact. Le code d'origine construisait les objets par mutations (`const q = {} as Query; q.text = …`). Tu le réécris avec la **décomposition** : chaque objet est créé d'un coup, et les champs facultatifs n'apparaissent que s'ils ont une valeur.

Tu édites `build.ts`.

## À faire

1. `withId(entity, id)` renvoie une copie de `entity` augmentée de `id`, sans modifier l'original. Laisse le type de retour inféré : TypeScript déduit `T & { id: string }` de la décomposition.
2. `buildQuery(text, options)` renvoie `{ text, page }` (page vaut `1` par défaut), plus `sort` **seulement** si `options.sort` est fourni et `tags` **seulement** si `options.tags` contient au moins un élément. Aucune clé à `undefined`.
3. `contactCard(first, last, middle?)` renvoie `{ first, last }` et `middle` seulement s'il est non vide, plus `fullName` (`"Harry S Truman"`).

## Contraintes

Pas d'objet vide muté, pas d'assertion `as`.
