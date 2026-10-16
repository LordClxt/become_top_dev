## Librairie, jalon 1

Tu repars du jalon 0 : la santé, le catalogue en lecture seule et `createApp()`. Tout se passe dans `app.ts`. Les tests passent **toujours** par `createApp()`, puis appellent `init()`.

## M1 — Le CRUD v1

Le catalogue passe en **v1** (versioning par URI) sous le préfixe `api` :

| Requête | Succès | Erreurs |
|---|---|---|
| `GET /api/v1/books` | 200, tableau trié par titre | — |
| `GET /api/v1/books/:isbn` | 200 | 404 |
| `POST /api/v1/books` | 201 + `Location: /api/v1/books/<isbn>` | 400 (schéma), 409 (ISBN pris) |
| `DELETE /api/v1/books/:isbn` | 204 | 404 |

Schéma du corps (`CreateBook`) : `isbn` qui respecte `^97[89]-\d{10}$`, et `title` et `author` non vides. `createApp()` enregistre `StandardSchemaValidationPipe` en pipe global. `/health` reste à la racine, sans version.

## M2 — La recherche v2

`GET /api/v2/books?author=&page=&limit=` renvoie `{ items, page, limit, total }`. `page` vaut 1 par défaut et doit être ≥ 1 ; `limit` vaut 10 par défaut et doit être entre 1 et 50 ; `author` filtre par sous-chaîne, sans tenir compte de la casse. Sinon, 400. La v1 ne change pas.

## M3 — Des routes sûres

- Ajoute `GET /api/v1/books/featured` : les livres dont `featured` vaut `true`. Déclare-la **après** `:isbn` dans le contrôleur.
- `createApp()` enregistre les routes par spécificité, et refuse de démarrer sur un doublon ou une route masquée.
