## Contexte

Tu écris le moteur d'expressions d'une bibliothèque de cartes : chaque calque calcule sa couleur ou sa taille à partir des propriétés d'une entité géographique (`feature.properties`). Le type `StyleExpression` doit être **exact** (aucune expression valide refusée) et aussi précis que raisonnable ; les tests de types listent des exemples valides et invalides.

Tu édites `style.ts`.

## À faire

1. `StyleExpression` : `number | string | boolean | CallExpression` avec
   - `['get', string]` : la propriété de l'entité, ou `null` si elle est absente ;
   - `['+' | '*' | '/', e, e]`, `['-', e]` ou `['-', e, e]` ;
   - `['==' | '!=' | '>' | '<' | '>=' | '<=', e, e]` ;
   - `['case', cond, valeur, …, défaut]` (interface, `length` 4, 6, 8 ou 10) ;
   - `['match', entrée, étiquette, valeur, …, défaut]` (interface, `length` 5, 7, 9 ou 11 ; les étiquettes sont des `string | number`) ;
   - `['coalesce', e, ...e[]]` : la première valeur non `null`.
2. `evaluate(expr, feature)` → `Value` (`number | string | boolean | null`). Mathématiques et `<`, `>`, `<=`, `>=` exigent des nombres (sinon `TypeError("nombre attendu")`) ; `==` / `!=` comparent avec `===`.
3. `propertiesUsed(expr)` : les noms de propriétés lus par `get`, sans doublon, dans l'ordre de première apparition.

## Contraintes

Pas de `any`, pas d'assertion `as` (hors annotations de variables).
