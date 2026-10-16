## Contexte

`BooksService` (fourni, dans `books.service.ts`) gère les livres en mémoire. `find` renvoie `undefined` si le livre n'existe pas, et `create` renvoie `null` si l'ISBN est déjà pris. Écris `BooksController` (`books.controller.ts`) pour respecter ce contrat :

| Route | Succès | Échec |
|---|---|---|
| `GET /books` | 200 + tableau | — |
| `GET /books/:isbn` | 200 + livre | 404 |
| `POST /books` (corps `{ isbn, title }`) | **201** + livre + en-tête `Location: /books/<isbn>` | **409** si l'ISBN existe déjà |
| `PUT /books/:isbn` (corps `{ title }`) | 200 + livre mis à jour | 404 |
| `DELETE /books/:isbn` | **204**, sans corps | 404 |

## Contraintes

- Les erreurs passent par les exceptions de `@nestjs/common` : `NotFoundException`, `ConflictException`.
- Pas de `@Res()` seul : la réponse reste standard. `Location` dépend de l'ISBN : utilise `passthrough`.
- Le test vérifie aussi qu'un intercepteur global (fourni) voit bien la valeur renvoyée par `POST` : si tu envoies la réponse à la main, il ne la verra pas.
