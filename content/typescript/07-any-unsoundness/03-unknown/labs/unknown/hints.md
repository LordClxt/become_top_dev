## Hint 1
`const value: unknown = JSON.parse(text);` : l'annotation transforme le `any` de `JSON.parse` en `unknown`.

## Hint 2
Dans `isBook`, après `typeof value === 'object' && value !== null`, `'title' in value` permet de lire `value.title` (de type `unknown`).

## Hint 3
`tags` : `!('tags' in value) || (Array.isArray(value.tags) && value.tags.every((t) => typeof t === 'string'))`.
