## Contexte

`BooksService` (fourni) contient 30 livres numérotés de 1 à 30. Les tests démarrent l'application avec `StandardSchemaValidationPipe` en pipe global, comme le ferait `main.ts`. Tu édites `books.controller.ts`.

## 1. `GET /books?author=&page=&limit=`

- `page` : entier, défaut **1**, minimum 1 ; `limit` : entier, défaut **10**, entre 1 et **50**.
- Une valeur non entière (`page=abc`) ou hors bornes → **400**.
- `author` (optionnel) filtre les livres dont l'auteur **contient** la chaîne, sans tenir compte de la casse.
- Réponse : `{ items, page, limit, total }`, où `total` compte les livres après filtrage et `items` contient la page demandée.

## 2. `GET /books/:id`

`id` entier (sinon **400**) ; livre absent → **404**.

## 3. `POST /books`

Le corps est validé par le schéma Zod `CreateBook` (à compléter dans le fichier) :

- `title` : chaîne non vide ;
- `author` : chaîne non vide ;
- `year` : entier entre 1450 et 2100.

Corps invalide → **400** (le pipe global s'en charge). Les champs inconnus du corps ne doivent **pas** arriver dans le livre créé. Réponse : **201** + le livre créé (avec son `id`).
