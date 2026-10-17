## Contexte

Une application reçoit des messages d'autres onglets (`postMessage`) : des valeurs `unknown`, envoyées par du code qu'on ne contrôle pas. Tu écris un **bus d'événements typé** : les émissions internes sont vérifiées à la compilation, les messages externes sont validés à l'exécution, et aucun `any` ne fuit.

Tu édites `bus.ts`.

## À faire

`EventBus<Events>` (`Events` associe chaque nom d'événement au type de sa charge utile) :

1. `constructor(validators)` : un type guard par événement (`{ [K in keyof Events]: (payload: unknown) => payload is Events[K] }`).
2. `on(event, handler)` : enregistre un handler typé ; renvoie une fonction de désabonnement.
3. `emit(event, payload)` : appelle les handlers de cet événement dans l'ordre d'inscription et renvoie le nombre de handlers appelés. Un handler qui lève une erreur n'empêche pas les suivants ; le message est ajouté à `errors()` sous la forme `"selected: boom"`.
4. `receive(raw)` (un `unknown`) : attend `{ event: string; payload: unknown }`. Renvoie
   - `{ ok: false, reason: 'message mal formé' }` si la forme est mauvaise,
   - `{ ok: false, reason: 'événement inconnu : x' }` si l'événement n'a pas de validateur (attention aux clés héritées comme `"toString"`),
   - `{ ok: false, reason: 'charge invalide pour selected' }` si le validateur refuse,
   - sinon émet et renvoie `{ ok: true, event, delivered }`.
5. `errors()` : une copie en lecture seule (`readonly string[]`).

## Contraintes

Pas de `any`. Une seule assertion, commentée, pour le stockage interne des handlers. Les handlers sont déclarés en **syntaxe propriété** (pas de bivariance).
