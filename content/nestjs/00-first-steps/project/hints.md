## Hint 1
Pour M1, mémorise l'instant de départ dans le constructeur du contrôleur (`this.startedAt = clock.now()`), puis calcule `Math.floor((clock.now() - this.startedAt) / 1000)` à chaque requête.

## Hint 2
Pour trier sans modifier `SEED`, copie d'abord le tableau : `[...this.books].sort((a, b) => a.title.localeCompare(b.title, 'fr'))`.

## Hint 3
`app.setGlobalPrefix('api', { exclude: ['health'] })` doit être appelé **avant** `app.init()`. Les tests appellent `init()` eux-mêmes : `createApp()` ne fait que créer et configurer.
