## Contexte

Ticket du partenaire de billetterie, priorité haute :

> 1. On réserve 9 places pour un maximum de 8 : la réservation **passe**.
> 2. On oublie le nombre de places : `500`, avec un texte sur JSON.
> 3. On réserve pour un événement qui n'existe pas : `500`.
> 4. `GET /reservations/13` nous renvoie `Erreur : Connection refused: db-prod-01.tixa.internal:5432 (user=tixa_rw)`. Votre équipe sécurité est au courant ?
> 5. Une requête envoyée par erreur en `text/plain` : `500` aussi. On ne sait jamais ce qui est de notre faute.

L'API doit répondre en **ProblemDetail** (`application/problem+json`) pour toutes ses erreurs, avec le bon statut.

## Ta mission

- Champs invalides ou manquants : **400**, avec une propriété `errors` qui liste chaque champ fautif (`field`, `message`).
- Événement inconnu (consultation ou réservation) : **404**, `type` = `https://tixa.example/problems/event-not-found`, et une propriété `eventId`.
- Panne imprévue : **500** générique, dont le texte contient « Référence » et ne révèle rien de l'intérieur.
- Les erreurs de Spring MVC (comme un mauvais `Content-Type`) gardent leur statut (415…).

Fichiers modifiables : `ApiErrors.java`, `NewReservation.java`, `EventNotFoundException.java`, `ReservationController.java`.
