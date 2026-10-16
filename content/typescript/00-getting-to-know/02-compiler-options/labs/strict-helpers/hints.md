## Hint 1
Chaque erreur `TS7006` (« implicitly has an 'any' type ») te dit quel paramètre n'a pas de type. Les erreurs sur `null` apparaissent ensuite : c'est `strictNullChecks` qui travaille.

## Hint 2
Un paramètre qui peut être absent s'écrit `string | null`. Dans la fonction, teste-le avant de l'utiliser : TypeScript affine alors le type (c'est le *narrowing*).

## Hint 3
`items[items.length - 1]` vaut `undefined` quand la liste est vide, mais TypeScript ne le sait pas sans `noUncheckedIndexedAccess` : écris toi-même `string | undefined` comme type de retour. Pour `firstWord`, `split` renvoie toujours au moins un élément… mais le type l'ignore, donc `?? ''`.
