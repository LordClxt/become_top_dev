## Hint 1
Remplacer `any` par `unknown` dans un paramètre ne casse rien si la fonction n'utilise pas la valeur.

## Hint 2
`export function loadUser(id: string): User { return oldLibrary.fetch(id); }` : l'annotation coupe la contagion.

## Hint 3
`pickKeys` : `Object.fromEntries(keys.filter((k) => k in record).map((k) => [k, record[k]]))`.
