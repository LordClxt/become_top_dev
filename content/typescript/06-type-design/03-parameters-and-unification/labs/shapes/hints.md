## Hint 1
`export function rect({ topLeft, size, opacity = 1 }: RectParams): string`.

## Hint 2
`overlaps` : `a.start <= b.end && b.start <= a.end`.

## Hint 3
Calcule d'abord `{ row, average }` pour chaque ligne, filtre, trie avec `toSorted`, puis formate avec `last_name.toUpperCase()`.
