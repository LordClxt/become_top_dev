## Hint 1
`/^\d{4}-\d{2}-\d{2}$/` vérifie le format ; `new Date(text + 'T00:00:00Z')` donne une date UTC.

## Hint 2
Un type guard `isRecordingType(s: string): s is RecordingType` évite l'assertion.

## Hint 3
`sortBy<T, K extends keyof T>(records: readonly T[], key: K): T[]` : compare `Number(a[key])` à `Number(b[key])` pour les nombres et les dates, `String(...).localeCompare(...)` pour les chaînes.
