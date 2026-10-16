## Contexte

Librairie prend des commandes. `OrdersService` (fourni, dans `orders.service.ts`) stocke les commandes en mémoire et applique les règles métier. Ton travail est d'écrire `OrdersController`, la frontière HTTP, en respectant **exactement** ce contrat. Les tests démarrent l'application avec `StandardSchemaValidationPipe` en pipe global.

## Le contrat

| Requête | Succès | Erreurs |
|---|---|---|
| `POST /orders` | **201**, la commande, en-tête `Location: /orders/<id>` | 400 si le corps est invalide |
| `GET /orders/:id` | 200, la commande, en-tête `Cache-Control: no-store` | 400 si `id` n'est pas un UUID, 404 si absente |
| `GET /orders?status=…` | 200, la liste (toutes si `status` est absent) | 400 si `status` n'est pas `pending`, `shipped` ou `cancelled` |
| `POST /orders/:id/cancel` | **200**, la commande annulée ; annuler une commande **déjà annulée** renvoie aussi 200 | 400 (UUID), 404, **409** si la commande est expédiée |

Corps de `POST /orders` (schéma `CreateOrder`, à écrire) :

- `items` : tableau de **1 à 20** lignes ;
- chaque ligne : `isbn` qui respecte `^97[89]-\d{10}$`, et `qty` entier de 1 à 10 ;
- les champs inconnus sont ignorés : un client ne peut pas imposer `status: "shipped"`.

## Pourquoi l'annulation idempotente ?

Le client mobile renvoie la requête quand le réseau coupe. Si la première annulation est passée, la seconde ne doit pas échouer : le client veut savoir que la commande **est** annulée, pas qu'elle vient de l'être. Tu retrouveras ce principe en grand au module 12.
