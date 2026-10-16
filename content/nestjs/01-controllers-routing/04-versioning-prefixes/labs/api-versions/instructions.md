## Contexte

L'application mobile utilise `GET /api/v1/books`, qui renvoie un **tableau**. La nouvelle application web veut `{ items, total }`. Les deux contrôleurs existent déjà dans `app.ts`, mais personne ne les a versionnés, et la sonde de santé doit continuer à répondre sur `/health`.

## Le contrat attendu

| Requête | Réponse |
|---|---|
| `GET /api/v1/books` | 200, tableau de livres |
| `GET /api/v2/books` | 200, `{ items, total }` |
| `GET /api/v1/books/count` | 200, `{ count }` : la route `count` existe en v1 et en v2, **écrite une seule fois** |
| `GET /api/v2/books/count` | 200, `{ count }` |
| `GET /api/books` | 404 : il faut une version |
| `GET /health` | 200 |
| `GET /api/health`, `GET /v1/health` | 404 |

## À faire

Complète `createApp()` et les décorateurs des contrôleurs. `createApp()` ne doit pas appeler `init()` ni `listen()` : les tests s'en chargent. Une route sans version explicite doit être servie en **v1**.
