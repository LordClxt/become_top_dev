## Hint 1
Commence par l'interface `Item`, puis remplace les `any` un par un en laissant `tsc` te dire ce qui casse : dans les corps, les annotations `(item: any)` deviennent inutiles, l'inférence les retrouve toute seule.

## Hint 2
`best` dans `longestWord` : `let best: string | undefined;` explique à TypeScript qu'il commence sans valeur. Le type de retour est le même.

## Hint 3
`readonly string[]` ou `readonly Item[]` pour les listes. Pour `ageInYears`, deux `number` et un retour `number` : l'inférence trouverait le retour seule, mais l'annoter fait partie de la signature publique.
