## Contexte

Les libraires saisissent les ISBN de toutes les façons : `9782253004226`, `978-2253004226`, `978 2 253 00422 6`. Et une faute de frappe d'un chiffre donne aujourd'hui un 404, alors que c'est l'ISBN lui-même qui est faux.

Écris deux pipes dans `pipes.ts`. Le contrôleur (fourni) les enchaîne : `@Param('isbn', ParseIsbnPipe, BookByIsbnPipe) book: Book`.

## `ParseIsbnPipe` (transformation + validation)

- Retire espaces et tirets ; il doit rester 13 chiffres commençant par `978` ou `979`.
- Vérifie la clé de contrôle ISBN-13 : chaque chiffre est multiplié alternativement par 1 et par 3 (en partant du premier) ; la somme doit être un multiple de 10.
- Renvoie la forme normalisée `978-XXXXXXXXXX`.
- Sinon : `BadRequestException` avec `errorCode: 'INVALID_ISBN'`.

## `BookByIsbnPipe` (transformation vers une entité)

Reçoit l'ISBN normalisé, renvoie le `Book` trouvé par `BooksService`, ou lève `NotFoundException`. Le pipe est passé **par sa classe** au décorateur : Nest l'instancie et lui injecte ses dépendances.
