## Librairie, jalon 0

Librairie est l'API d'une boutique de livres que tu vas construire tout au long du cours. Ce premier jalon pose la structure que tous les suivants réutiliseront. Tout le code tient dans `app.ts`.

## M1 — Le point de santé

- `Clock` (provider) expose `now(): number` (millisecondes, `Date.now()` par défaut).
- `HealthController` répond à `GET /health` par `{ status: 'ok', uptimeS }`, où `uptimeS` est le nombre **entier** de secondes écoulées depuis la création du contrôleur, calculé avec `Clock`.
- `HealthModule` déclare les deux. Les tests remplacent `Clock` par une fausse horloge : ne lis jamais `Date.now()` directement dans le contrôleur.

## M2 — Le catalogue

- `BooksService` garde en mémoire les livres de `SEED` (fourni) et expose `findAll()` (triés par titre, ordre alphabétique français, `localeCompare`) et `count()`.
- `BooksController` : `GET /books` → la liste triée, `GET /books/count` → `{ count }`.
- `CatalogModule` déclare le contrôleur et le service, et **exporte** le service.
- `AppModule` importe `HealthModule` et `CatalogModule`.

## M3 — Une seule fabrique d'application

`createApp()` renvoie (sans appeler `listen`) une application créée avec `NestFactory.create(AppModule, { logger: false })` et configurée :

- préfixe global `api` : le catalogue est servi sous `/api/books` ;
- **sauf** `/health`, qui reste à la racine (les sondes de l'orchestrateur ne connaissent pas ton préfixe) ;
- `enableShutdownHooks()`, pour fermer proprement sur SIGTERM (module 04).

Pourquoi une fabrique ? Si `main.ts` configure l'application d'un côté et les tests de l'autre, les tests valident une application qui n'est pas celle de la production. Avec `createApp()`, il n'y en a qu'une.
