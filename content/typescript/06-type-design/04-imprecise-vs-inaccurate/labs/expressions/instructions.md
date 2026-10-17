## Contexte

Les expressions de style Mapbox de la leçon. Le type de départ, `any`, accepte tout. Tu écris le type récursif (`Expression4` du livre, étendu au moins unaire pour rester **exact**) et l'évaluateur qui va avec. Les tests de types listent des expressions valides (qui doivent compiler) et invalides (qui doivent être refusées).

Tu édites `expression.ts`.

## À faire

1. `Expression` : `number | string | CallExpression`, avec :
   - `MathCall` : `['+' | '*' | '/' | '>' | '<', Expression, Expression]` ;
   - `MinusCall` : `['-', Expression]` (moins unaire) **ou** `['-', Expression, Expression]` : Mapbox accepte les deux, le type doit les accepter ;
   - `CaseCall` : une interface (`0: 'case'`, `[n: number]: Expression`, `length: 4 | 6 | 8 | 10`) ;
   - `RGBCall` : `['rgb', Expression, Expression, Expression]`.
2. `evaluate(expr)` renvoie `number | string | boolean` :
   - nombres et chaînes : eux-mêmes ; opérations mathématiques sur des nombres ; `>` et `<` renvoient un booléen ;
   - `case` : renvoie la valeur de la première condition vraie, sinon la dernière valeur (défaut) ;
   - `rgb` : `"rgb(255, 128, 64)"` ;
   - un opérande du mauvais type (une chaîne dans une addition) → `TypeError("nombre attendu")`.

## Contraintes

Pas de `any`.
