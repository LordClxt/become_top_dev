## Le besoin

Les lecteurs peuvent maintenant laisser un avis sur un livre. L'API est publique : des partenaires vont l'intégrer, il faut un contrat irréprochable dès le premier jour. Tout est à construire dans `app.ts`, y compris `createApp()`.

Pas d'indices pour ce combat.

## Le contrat

Les livres existants sont `978-2253004226` et `978-2070413119` (exporte-les sous le nom `BOOKS`). Un avis : `{ author, rating, text }`, avec `author` de 1 à 40 caractères, `rating` entier de 1 à 5, `text` de 10 à 2000 caractères. Le serveur ajoute `id` (entier, à partir de 1) et `isbn`.

**v1**, sous `/api/v1/books/:isbn/reviews` :

| Requête | Succès | Erreurs |
|---|---|---|
| `GET …/reviews` | 200, tableau | 404 livre inconnu |
| `GET …/reviews/summary` | 200 `{ count, average }`, moyenne arrondie à une décimale, `null` sans avis | 404 |
| `POST …/reviews` | 201 + `Location: /api/v1/books/<isbn>/reviews/<id>` | 400 corps invalide, 404, **409** si l'auteur a déjà un avis sur ce livre |
| `DELETE …/reviews/:id` | 204 sans corps | 400 id non numérique, 404 |

**v2**, `GET /api/v2/books/:isbn/reviews?minRating=&limit=&offset=` renvoie `{ items, total, limit, offset }`. Valeurs par défaut : `minRating` 1, `limit` 10, `offset` 0. `minRating` entre 1 et 5, `limit` entre 1 et 20, `offset` ≥ 0, sinon 400. La v1 ne change pas.

**Application.** `/health` répond hors préfixe et hors version. Aucune route sans version sous `/api`. `createApp()` doit refuser de démarrer sur une route en double ou masquée.

Dans le débriefing, explique ce qui, dans `createApp()`, empêchera un collègue d'ajouter demain un `GET …/reviews/:id` qui masquerait `summary`.
