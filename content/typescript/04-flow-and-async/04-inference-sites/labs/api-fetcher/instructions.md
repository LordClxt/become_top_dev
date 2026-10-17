## Contexte

Une API de graines (`SeedAPI`) décrit chaque route et le type de sa réponse. Tu écris deux clients typés : un avec une **classe**, un avec la **curryfication**. Chaque appel doit connaître le type exact de sa réponse, et une route inconnue doit être refusée à la compilation.

Tu édites `api.ts`. `rawFetch(path)` simule le réseau et renvoie un `unknown`.

## À faire

1. `ApiFetcher<API>` : le constructeur reçoit une URL de base (`'https://seeds.example'`). `fetch(path)` (méthode générique sur `Path extends keyof API & string`) renvoie `Promise<API[Path]>` et ajoute le chemin à l'historique ; `history()` renvoie les URL complètes appelées, dans l'ordre.
2. `fetchAPI<API>()` renvoie une fonction `(path) => Promise<API[Path]>`.
3. `fetchMany(fetcher, paths)` : lance tous les chemins en parallèle et renvoie les réponses dans l'ordre.

## Contraintes

Une seule assertion `as`, justifiée, à l'endroit où l'`unknown` du réseau devient `API[Path]` (une par client). Pas de propriétés de paramètre (`constructor(private base)`) : elles ne sont pas compatibles avec la suppression de types de Node.
