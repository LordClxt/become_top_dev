---
id: nest-ch02-l04
title: "Portées et contagion"
source: { chapter: 15, pages: "#provider-scope, #scope-hierarchy, #request-provider, #inquirer-provider, #performance", url: "https://docs.nestjs.com/fundamentals/injection-scopes" }
duration_min: 40
concepts:
  - id: nest-injection-scopes
    label: "DEFAULT (singleton, recommandé), REQUEST (une instance par requête), TRANSIENT (une instance par consommateur)"
  - id: nest-scope-bubbling
    label: "La portée REQUEST remonte la chaîne : tout ce qui en dépend devient request-scoped ; TRANSIENT ne remonte pas"
  - id: nest-request-provider
    label: "@Inject(REQUEST) donne l'objet requête et rend le provider request-scoped ; AsyncLocalStorage évite la contagion"
  - id: nest-inquirer
    label: "@Inject(INQUIRER) dans un provider transient donne l'instance de la classe qui l'a demandé"
glossary:
  - term: "portée (scope)"
    definition: "La durée de vie d'une instance de provider : l'application, une requête, ou un consommateur."
  - term: "contagion"
    definition: "La propagation de la portée REQUEST vers tous les providers qui en dépendent, directement ou non."
  - term: "AsyncLocalStorage"
    definition: "Un mécanisme de Node qui associe une valeur à une chaîne d'appels asynchrones, comme une variable propre à chaque requête."
visuals: [nest-ch02-scope-bubbling]
labs: [nest-ch02-l04-lab-request-context]
extra: false
xp: 35
---

> **En une phrase :** presque tout est partagé entre les requêtes ; quand un provider doit vivre le temps d'une requête, tout ce qui en dépend le suit.

## Le problème

Tu veux que chaque ligne d'audit porte l'identifiant de la requête (`x-request-id`). Première idée : un champ sur un service.

```ts
@Injectable()
export class RequestContext {
  requestId = '';                 // posé au début de la requête, lu plus tard
}
```

Deux requêtes arrivent en même temps. La seconde écrase `requestId` pendant que la première attend la base de données. La première écrit alors l'identifiant **de l'autre**. Aucune erreur : juste des journaux faux.

C'est la surprise des développeurs qui viennent de Java ou de PHP : dans Nest, il n'y a **qu'un seul** `RequestContext`, partagé par toutes les requêtes. Node ne lance pas un fil d'exécution par requête ; tout tourne dans le même processus.

## Étape 1 — les trois portées

| Portée | Combien d'instances | Usage |
|---|---|---|
| `Scope.DEFAULT` | une pour toute l'application, créée au démarrage | la règle, presque toujours |
| `Scope.REQUEST` | une par requête entrante, jetée ensuite | lire des données de la requête |
| `Scope.TRANSIENT` | une par **consommateur** | un logger qui connaît la classe qui l'utilise |

La version correcte du contexte :

```ts
@Injectable({ scope: Scope.REQUEST })
export class RequestContext {
  constructor(@Inject(REQUEST) private readonly request: Request) {}
  get requestId() { return this.request.header('x-request-id') ?? 'anonymous'; }
}
```

Pour un provider personnalisé, la portée se met dans la forme longue : `{ provide: X, useClass: Y, scope: Scope.TRANSIENT }`.

## Étape 2 — la contagion

Voici le point qui surprend tout le monde. Graphe : `OrdersController → OrdersService → RequestContext`, et `OrdersService → CatalogRepository`.

Si `RequestContext` est request-scoped :
- `OrdersService` en a besoin. Un singleton ne peut pas garder une référence vers un objet qui change à chaque requête : `OrdersService` devient donc lui aussi request-scoped.
- `OrdersController` a besoin de `OrdersService` : même raisonnement, il devient request-scoped.
- `CatalogRepository` n'a **pas** besoin de `RequestContext` : il reste un singleton.

La portée remonte **vers ceux qui consomment**, jamais vers les dépendances.

::visual{id="nest-ch02-scope-bubbling"}

Conséquence très concrète : si `OrdersService` gardait des commandes dans une `Map`, cette `Map` repartirait **vide à chaque requête**. Un état qui doit durer va donc dans un singleton qui ne dépend pas de la requête (ici `CatalogRepository`, ou un `OrdersRepository`), qu'on injecte.

TRANSIENT, lui, ne remonte pas : un singleton qui injecte un logger transient reçoit **son propre** logger, et reste un singleton.

## Étape 3 — savoir qui t'a demandé : `INQUIRER`

```ts
@Injectable({ scope: Scope.TRANSIENT })
export class AuditLogger {
  constructor(@Inject(INQUIRER) private readonly parent: object) {}
  log(msg: string) { console.log(`${this.parent.constructor.name}: ${msg}`); }
}
```

Chaque consommateur reçoit son instance ; `INQUIRER` lui donne la classe qui l'a demandée. `OrdersService` écrira `OrdersService: …`, sans rien passer.

## Étape 4 — l'alternative sans contagion : `AsyncLocalStorage`

Souvent, un provider n'est request-scoped que pour **lire** une valeur (l'utilisateur, le locataire, l'identifiant de requête). Node offre un outil qui évite toute la contagion : `AsyncLocalStorage`. Il associe une valeur à **une chaîne d'appels asynchrones**, comme une variable propre à chaque requête.

```ts
import { AsyncLocalStorage } from 'node:async_hooks';

const als = new AsyncLocalStorage<{ requestId: string }>();

async function handle(id: string) {
  await new Promise((r) => setTimeout(r, 10));     // la requête attend la base…
  return als.getStore()?.requestId;                 // …et retrouve SON identifiant
}

const results = await Promise.all([
  als.run({ requestId: 'a' }, () => handle('a')),
  als.run({ requestId: 'b' }, () => handle('b')),
]);
console.log(results); // [ 'a', 'b' ]
```

`als.run(store, fn)` ouvre un contexte ; tout ce qui s'exécute à partir de `fn`, même après des `await`, voit ce `store`. Dans Nest, on ouvre ce contexte **à l'entrée** de chaque requête (avec un middleware, chapitre 03), et un `RequestContext` **singleton** lit `als.getStore()`. Tous les providers restent des singletons. Bonus : ça marche aussi dans un job de file ou un message de microservice, où il n'y a pas de requête HTTP.

## Sous le capot

Comment Nest décide-t-il qu'un provider est request-scoped ? Dans `injector/instance-wrapper.js`, chaque enveloppe de provider calcule `isDependencyTreeStatic()` :
- si sa portée déclarée est `REQUEST`, la réponse est non ;
- sinon, elle est oui **seulement si toutes ses dépendances** (constructeur, propriétés injectées, et aussi les *enhancers* : guards, intercepteurs, pipes attachés) sont elles-mêmes statiques. Le calcul est récursif.

C'est toute la contagion : une seule dépendance non statique, n'importe où en dessous, et la réponse remonte. Un intercepteur request-scoped posé sur un contrôleur rend donc ce contrôleur request-scoped, lui aussi.

Les instances sont rangées dans l'enveloppe, dans une `WeakMap` indexée par un **identifiant de contexte**. Les singletons utilisent un contexte statique unique. Pour chaque requête, le routeur crée un nouvel identifiant de contexte, et l'injecteur construit les instances request-scoped pour cet identifiant. Quand la requête est finie, plus rien ne référence l'identifiant : la `WeakMap` laisse le ramasse-miettes tout libérer.

## Pièges fréquents

- **Un état propre à la requête dans un singleton.** Écrasé par la requête voisine, sans erreur.
- **Un état durable dans un provider contaminé.** Il repart de zéro à chaque requête.
- **Un provider REQUEST tout en bas du graphe** (connexion, logger). Il contamine presque tout.
- **Les stratégies Passport et les tâches cron** doivent rester des singletons : la doc les signale explicitement.

## En production

- Chaque requête reconstruit la partie contaminée du graphe. La doc annonce une hausse de latence d'environ 5 % pour une application bien conçue ; sur un graphe profond, mesure (charge avec `autocannon` ou `k6`, avant et après).
- Pour lire l'utilisateur ou le locataire dans 80 services, préfère `AsyncLocalStorage` à un provider REQUEST.

## À retenir

- Singleton par défaut ; REQUEST remonte vers les consommateurs, TRANSIENT non.
- Isole l'état durable dans des singletons qui ne dépendent pas de la requête.
- `INQUIRER` pour un provider transient qui doit connaître son consommateur.
- Pour lire une valeur de la requête partout sans contagion : `AsyncLocalStorage`.
