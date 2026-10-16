## Contexte

TypeScript est **structurel** : une valeur convient dès qu'elle a les bonnes propriétés, peu importe sa classe. On en tire deux leçons : un `Vector3D` est aussi un `Vector2D` (piège), et une fonction qui déclare juste ce dont elle a besoin se teste sans mock (atout).

Tu édites `authors.ts`.

## 1. `length`

`length` accepte `Vector2D | Vector3D` et tient compte de `z` quand il existe. Un test passe aussi `{ x: 1, y: 2, z: 2 }`.

## 2. `getAuthors` et `QueryRunner`

- Déclare et exporte `interface QueryRunner` avec **une seule méthode** : `runQuery(sql, params)`, qui renvoie une promesse de lignes (chaque ligne a un `name`).
- `getAuthors(db: QueryRunner)` exécute `SELECT name FROM authors WHERE active = $1` avec le paramètre `[true]` et renvoie les noms **triés** (ordre alphabétique).

Les tests passent un simple objet littéral : aucune classe de base de données n'est nécessaire.

## Contraintes

Pas de `any`. L'interface ne doit contenir que `runQuery`.
