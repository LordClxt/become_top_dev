## Hint 1
Chaque filtre a la forme `return async function* (input) { for await (const x of input) { … yield … } }`. `compose` n'est qu'un `reduce` qui applique chaque filtre au résultat du précédent.

## Hint 2
Pour `take`, fais un `return` dès que tu as émis n éléments, **à l'intérieur** de la boucle `for await` : sortir d'une boucle `for await` appelle `return()` sur l'itérateur amont, ce qui exécute son `finally`.

## Hint 3
`countSorted` ne peut émettre qu'après avoir tout lu : compte dans une `Map`, puis trie les entrées avec `b[1] - a[1] || a[0].localeCompare(b[0])`, puis `yield*` le résultat.
