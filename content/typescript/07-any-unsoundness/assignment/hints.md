## Hint 1
`const value: unknown = JSON.parse(text);` dans un `try`. Puis `isRecord(value)` donne accès à `value.port` (de type `unknown`).

## Hint 2
Écris un petit validateur par champ qui renvoie la valeur ou `undefined`, et pousse un message dans un tableau `errors` quand il échoue.

## Hint 3
`env.APP_PORT` est `string | undefined` : teste-le avant de le convertir.
