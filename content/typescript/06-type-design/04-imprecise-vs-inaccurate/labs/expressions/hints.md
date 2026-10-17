## Hint 1
`type MinusCall = ['-', Expression] | ['-', Expression, Expression];` Le type complet : `type CallExpression = MathCall | MinusCall | CaseCall | RGBCall;`.

## Hint 2
Écris `num(e: Expression): number` qui évalue puis vérifie `typeof … === 'number'`. Pour rétrécir l'union de tuples, teste `expr[0]` après avoir écarté les nombres et les chaînes.

## Hint 3
`case` : `for (let i = 1; i < expr.length - 1; i += 2)` ; la condition est `expr[i]`, la valeur `expr[i + 1]` ; le défaut est `expr[expr.length - 1]`. Avec la signature d'index de `CaseCall`, ces accès sont des `Expression`.
