## Hint 1
Change les types des paramètres en `readonly number[]` et regarde ce que TypeScript refuse : `pop` n'existe pas, `sort` non plus. Ce sont exactement les mutations à retirer.

## Hint 2
`[...nums].sort(…)` trie une copie. `{ ...user, name }` crée un nouvel objet, mais les tableaux imbriqués sont partagés : copie `tags` aussi.

## Hint 3
Pour `lastTwo`, `items[items.length - 2]` vaut `string | undefined` pour TypeScript (même s'il existe) : après avoir vérifié la longueur, un `!` est justifié.
