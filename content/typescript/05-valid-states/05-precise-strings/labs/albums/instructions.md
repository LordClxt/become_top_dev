## Contexte

La discothèque de la leçon arrive d'un fichier où tout est chaîne. Tu définis des types précis, tu convertis les données brutes, et tu écris des utilitaires typés par `keyof`.

Tu édites `albums.ts`.

## À faire

1. `RecordingType` = `'studio' | 'live'` ; `Album` utilise `Date` et `RecordingType`.
2. `parseAlbum(raw)` : convertit un `RawAlbum` ; `recordingType` est insensible à la casse et aux espaces (`" Studio "` → `'studio'`) ; une date au format `AAAA-MM-JJ` uniquement (sinon `Error("date invalide : …")`), un type d'enregistrement inconnu → `Error("type d'enregistrement inconnu : …")`.
3. `pluck(records, key)` : `T[K][]`.
4. `ofType(albums, type)` : les albums d'un type d'enregistrement.
5. `sortBy(records, key)` : une copie triée par la colonne `key` (ordre croissant), pour des colonnes de type `string`, `number` ou `Date`.

## Contraintes

Pas de `any`. Pas de `key: string` : les clés sont des `keyof`.
