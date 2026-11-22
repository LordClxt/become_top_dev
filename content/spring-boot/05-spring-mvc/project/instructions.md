## Contexte

Les partenaires de Tixa veulent intégrer le catalogue et réserver pour leurs clients. Tu construis l'API publique, sous `/api`, avec tout ce que le module a montré.

Fournis : `Event` (modèle interne), `EventStore` (catalogue en mémoire ; `take(id, seats)` retire des places ou répond `false`), `Customer` et `CustomerDirectory`. Fournis aussi : `CurrentCustomer` (l'annotation) et `Reservation` (le record renvoyé). À compléter : `ApiController`, `EventView` (les contrats v1 et v2, en records imbriqués), `Problems` (les erreurs métier), `ApiErrors` (le conseil), `CurrentCustomerResolver`, `CorrelationIdFilter`, `WebConfig` et `ReservationRequest`. Ils compilent déjà, mais ne font rien. Tests par jalon : `jboot M1`, `jboot M2`, `jboot M3`.

## M1 — Le catalogue et ses erreurs

- `GET /api/events` : la liste, contrat v1 : `{"id", "name", "date" (date seule), "city", "seatsLeft"}`.
- `GET /api/events/{id}` : un événement, même contrat.
- Toutes les erreurs en ProblemDetail (`application/problem+json`). Événement inconnu : **404**, `type` = `https://tixa.example/problems/event-not-found`. Identifiant non numérique : 400.

## M2 — Réserver

`POST /api/events/{id}/reservations`, corps `{"seats": 1 à 8, "email": "…"}` :
- le client vient de `X-Customer-Id` (via un paramètre typé, pas une lecture d'en-tête dans la méthode) ; absent ou inconnu : **401** ;
- demande invalide : **400** avec `errors` (`field`, `message`) ;
- succès : **201**, en-tête `Location: /api/reservations/{n}`, corps `{"id", "eventId", "customerId", "seats", "email"}` ;
- plus assez de places : **409**, `type` = `https://tixa.example/problems/sold-out`, et aucune place retirée.

## M3 — Corrélation et versions

- `X-Request-Id` sur **toutes** les réponses, erreurs comprises : un identifiant sûr (`[A-Za-z0-9-]{1,64}`) envoyé par le client est repris, sinon un UUID est généré.
- Versionnement par l'en-tête `API-Version`, versions 1 et 2, **version 1 par défaut**. `GET /api/events/{id}` en version 2 : `{"id", "title", "startsAt", "venue": {"name", "city"}, "seatsLeft"}`. Version inconnue : 400.
