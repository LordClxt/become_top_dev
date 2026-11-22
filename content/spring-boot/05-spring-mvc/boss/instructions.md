## Contexte

Les réseaux mobiles coupent : l'application d'un partenaire renvoie la même réservation quand elle n'a pas reçu la réponse, et Tixa a déjà vendu deux fois les mêmes places. La règle du marché : le client joint à chaque `POST` un en-tête **`Idempotency-Key`**, unique par intention d'achat. Une même clé rejouée doit produire **la même réponse**, sans rien refaire.

Fournis : `EventStore` (`find`, `take(id, seats)` qui retire des places ou répond `false`), `CustomerDirectory`, l'annotation `CurrentCustomer` et son résolveur `CurrentCustomerResolver` (non enregistré), l'annotation `IdempotencyKey`, le record `Reservation`. À toi : `ReservationController`, `IdempotencyKeyResolver`, `IdempotencyStore`, `ApiErrors`, `WebConfig`, `ReservationRequest`.

Pas d'indices pour ce combat : tout ce qu'il faut est dans les cinq leçons du module.

## Les règles de `POST /reservations`

Corps : `{"eventId": …, "seats": 1 à 8, "email": "…"}`. Toutes les erreurs sortent en ProblemDetail (`application/problem+json`), avec `type` = `https://tixa.example/problems/<nom>`.

- **`Idempotency-Key`** : obligatoire, 8 à 64 lettres, chiffres ou tirets, fournie à la méthode par un paramètre `@IdempotencyKey String`. Absente ou invalide : **400** `idempotency-key-missing`.
- **Client** : `@CurrentCustomer Customer`, depuis `X-Customer-Id`. Absent ou inconnu : **401**.
- **Demande invalide** : **400**, propriété `errors` avec chaque champ fautif (`field`, `message`).
- **Succès** : **201**, `Location: /reservations/{id}`, la réservation en corps.
- **Rejeu** (même clé, même client, même demande) : la **même** réponse (statut, `Location`, corps identique), plus l'en-tête `Idempotent-Replayed: true` ; aucune place retirée de nouveau.
- **Même clé, autre demande ou autre client** : **422** `idempotency-key-reused`, sans rien réserver.
- **Événement inconnu** : **404** `event-not-found`. **Plus assez de places** : **409** `sold-out`.
- Un **échec** n'est pas mémorisé : la même clé peut servir une fois la demande corrigée.
