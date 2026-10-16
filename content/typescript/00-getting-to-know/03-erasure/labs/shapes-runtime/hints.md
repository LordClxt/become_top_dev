## Hint 1
`instanceof` teste une valeur contre un constructeur. Une `interface` n'a pas de constructeur : elle n'existe qu'en TypeScript. Il faut une information qui existe aussi dans l'objet, à l'exécution.

## Hint 2
Une propriété littérale `kind: 'rectangle'` joue ce rôle : un `switch (shape.kind)` ou un `if (shape.kind === ...)` affine le type dans chaque branche. Pour `asNumber`, `Number(...)` convertit ; pense à `Number.isNaN`, et au cas de la chaîne vide (`Number('')` vaut `0`).

## Hint 3
Pour `parseSwitch`, teste `typeof raw` : `'boolean'` → renvoie tel quel ; `'string'` → `trim().toLowerCase()` puis compare à `'on'` / `'off'` ; sinon, `throw new TypeError(...)`.
