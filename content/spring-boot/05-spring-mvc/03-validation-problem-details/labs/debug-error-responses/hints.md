## Hint 1
Reprends les symptômes un par un, sur le trajet de la leçon 1. Une contrainte qui ne bloque rien : la validation est-elle **déclenchée** ? Un champ absent qui donne une erreur « sur JSON » : la lecture échoue avant la validation (leçon 2, Jackson 3 et les primitifs). Le 415 devenu 500 : quel `@ExceptionHandler` attrape une exception de Spring MVC ?

## Hint 2
Un gestionnaire d'`Exception` seul dans un conseil attrape **tout**, y compris les exceptions de Spring MVC. Fais étendre `ResponseEntityExceptionHandler` au conseil : ses gestionnaires dédiés sont plus proches de chaque exception de Spring MVC, et il sait écrire une `ErrorResponseException`. Pour le 404, fais hériter `EventNotFoundException` d'`ErrorResponseException`.

## Hint 3
`@Valid` sur le `@RequestBody` ; `@NotNull Integer seats` au lieu de `int` ; dans le conseil, surcharge `handleMethodArgumentNotValid` pour ajouter `errors` au `ex.getBody()`, puis `return handleExceptionInternal(ex, problem, headers, status, request)` ; l'imprévu renvoie `ProblemDetail.forStatusAndDetail(INTERNAL_SERVER_ERROR, "Erreur interne. Référence : " + uuid)` et journalise l'exception.
