## Contexte

Les types de ce fichier sont corrects… sur des chaînes courtes. Les tests de types les appliquent à des chaînes de plus de 100 caractères, et ils échouent (« excessively deep »). Tu les réécris en **récursion terminale**, et tu remplaces une fonction récursive par une boucle.

Tu édites `recursion.ts`.

## À faire

1. `GetChars<S>` : l'union des caractères de `S` (terminal, avec accumulateur).
2. `Length<S>` : la longueur d'un littéral de chaîne, en nombre (accumule les caractères dans un tuple et lis son `length`).
3. `ToSnake<S>` : `camelCase` → `snake_case` (terminal) ; `ToSnake<string>` = `string`.
4. `toSnake(s)` à l'exécution, et `sum(nums)` **sans récursion** (doit tenir 200 000 éléments).

## Contraintes

Pas de `any`. Une assertion autorisée dans `toSnake`.
