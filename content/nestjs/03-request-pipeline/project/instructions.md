## Librairie, jalon 3

Tu repars du jalon 2 : catalogue, commandes, prix, identifiants. Tout est encore dans `app.ts`, et une nouvelle section `pipeline (jalon 3)` t'attend près du début du fichier.

## M1 — Le contexte sans contagion

Au jalon 2, `RequestContext` était request-scoped : `OrdersService` et `OrdersController` étaient recréés à chaque requête. Remplace-le par un **singleton** qui lit un contexte `AsyncLocalStorage`, ouvert par un middleware pour toutes les routes. Le middleware reprend `x-request-id` (sinon `req_<n>`) et le renvoie en en-tête. Plus aucun `Scope.REQUEST` dans le fichier.

## M2 — Les écritures réservées

`POST /api/v1/books` et `DELETE /api/v1/books/:isbn` portent déjà `@Staff()`. Écris ce décorateur et un guard **global** : sur une route `@Staff()`, l'en-tête `x-api-key` doit valoir `STAFF_KEY`, sinon **401** avec `errorCode: 'INVALID_KEY'`. Les lectures et les commandes restent publiques.

## M3 — Des erreurs traçables

Un filtre global renvoie toutes les erreurs sous la forme `{ statusCode, errorCode, message, requestId }` (`errorCode` : celui de l'exception, sinon le nom du statut ; une erreur inattendue donne 500 `INTERNAL_ERROR` sans détail). Un intercepteur global pose `x-response-time-ms` sur chaque succès.

Dans la revue, explique pourquoi `OrdersService` est redevenu un singleton, et ce que ça change pour la latence.
