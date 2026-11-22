## Hint 1
Reprends les solutions des TP du module : le conseil d'erreurs de la leçon 3, le résolveur de la leçon 2, le filtre de la leçon 4, la configuration de version de la leçon 5. Les contrats publics (v1, v2) sont des records à part, construits depuis `Event`.

## Hint 2
Pour le 409 sans retrait de places, vérifie le résultat de `take` et lève une `ErrorResponseException` portant le type `sold-out`. Pour `Location` : `ResponseEntity.created(URI.create("/api/reservations/" + id)).body(reservation)`. Pour le 404 en réservation, cherche l'événement avant de réserver.

## Hint 3
Une fabrique d'erreurs métier évite de répéter `ProblemDetail.forStatusAndDetail(...)`, `setType`, `setTitle` : `new ErrorResponseException(status, body, null)`. Côté versions : `setDefaultVersion("1")`, sinon toutes les requêtes sans en-tête répondent 400.
