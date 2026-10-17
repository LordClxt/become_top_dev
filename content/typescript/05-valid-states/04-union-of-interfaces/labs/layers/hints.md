## Hint 1
`export interface FillLayer { type: 'fill'; layout: FillLayout; paint: FillPaint }`, et de même pour les deux autres.

## Hint 2
`toISOString().slice(0, 10)` donne `AAAA-MM-JJ`.

## Hint 3
`fromApi` : `const { name, placeOfBirth, dateOfBirth } = raw;` ; si les deux sont présents, `birth: { place: placeOfBirth, date: new Date(dateOfBirth) }` ; si un seul l'est, l'erreur.
