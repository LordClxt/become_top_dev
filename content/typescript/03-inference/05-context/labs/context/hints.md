## Hint 1
`const language = 'TypeScript';` ou `let language: Language = 'TypeScript';`.

## Hint 2
`export function panTo(where: readonly [number, number])`. Pour stocker la position dans l'historique, copie-la : `[where[0], where[1]]`.

## Hint 3
`const cities: Layer = { … }` ou `satisfies Layer`. Pour logClick : `const logClick: ClickHandler = (x, y) => …`.
