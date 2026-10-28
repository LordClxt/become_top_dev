## Contexte

Au chapitre 02, l'identifiant de requête passait par un provider `Scope.REQUEST`, qui contaminait toute la chaîne. Ici, on le remplace par la solution annoncée : un middleware ouvre un contexte `AsyncLocalStorage` à l'entrée de chaque requête, et un `RequestContext` **singleton** le lit n'importe où.

Écris `context.ts`. `app.ts` (fourni) branche le middleware sur toutes les routes et utilise le contexte dans un service lent.

## Ce qui est attendu

- `RequestContext.run(store, fn)` exécute `fn` dans un nouveau contexte ; `requestId` lit celui de la requête en cours, et lève une erreur hors requête.
- `RequestIdMiddleware` : reprend `x-request-id` s'il est fourni, sinon génère `req_<n>` ; renvoie l'identifiant dans l'en-tête `x-request-id` ; exécute la suite de la requête **dans** le contexte.
- Aucun provider request-scoped : le test lit ton fichier.
