## Hint 1
Écris un petit lecteur par champ (`readEmail`, `readAge`, `readNewsletter`) qui renvoie la valeur propre ou `null`. `validateSignUp` n'a plus qu'à assembler : ça évite l'arrêt à la première erreur.

## Hint 2
Pour l'âge, convertis d'abord une chaîne non vide avec `Number(...)`, puis vérifie `typeof === 'number'`, `Number.isInteger` et la plage. `NaN` n'est pas un entier : `Number.isInteger(NaN)` vaut `false`.

## Hint 3
`mapResult` : `result.ok ? { ok: true, value: f(result.value) } : result`. TypeScript accepte de renvoyer `result` dans la branche d'échec, car son type est déjà celui d'un échec. `unwrap` : un `switch (result.ok)` avec `case true`, `case false` et `default: return assertUnreachable(result)`.
