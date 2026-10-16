## Contexte

Ton application reçoit un flux d'événements en JSON depuis le réseau. Le type TypeScript des événements existe déjà (`AppEvent`, une union taguée), mais **rien ne garantit** que ce qui arrive le respecte : les types sont effacés. Tu écris la frontière de validation et un petit calcul dessus.

Tu édites `events.ts`.

## 1. `parseEvent(raw: unknown): AppEvent`

Valide **à l'exécution** une valeur inconnue et renvoie un événement proprement typé, ou lève `TypeError` :

- `raw` doit être un objet (pas `null`, ni un tableau) ;
- `user-created` : `id` chaîne non vide, `email` chaîne non vide contenant `@` ;
- `user-deleted` : `id` chaîne non vide ;
- `purchase` : `id` chaîne non vide, `amountCents` entier **strictement positif** ;
- tout autre `type` : `TypeError`.

Les champs inconnus ne sont pas recopiés dans le résultat.

## 2. `parseEvents(raws)`

Applique `parseEvent` à chaque élément, garde les valides, compte les rejetés.

## 3. `summarize(events)`

- `users` : nombre d'utilisateurs **actifs** (créés puis pas supprimés ; un même `id` créé deux fois compte une fois) ;
- `revenueCents` : somme des achats.

## Contraintes

Aucun `any`, aucune assertion `as` dans ton code. Les tests vérifient les types avec `tsc --strict` et refusent des appels invalides.
