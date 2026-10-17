---
id: nest-ch02-l05
title: "ModuleRef et dépendances circulaires"
source: { chapter: 17, pages: "#retrieving-instances, #resolving-scoped-providers, #instantiating-custom-classes-dynamically ; /fundamentals/circular-dependency", url: "https://docs.nestjs.com/fundamentals/module-ref" }
duration_min: 35
concepts:
  - id: nest-module-ref
    label: "ModuleRef.get() récupère un singleton ; resolve() construit un sous-arbre scoped (même contextId = même instance) ; create() instancie une classe non enregistrée"
  - id: nest-circular-dependency
    label: "Un cycle entre providers ou modules se contourne par forwardRef des deux côtés, mais se corrige en extrayant la responsabilité partagée"
glossary:
  - term: "contextId"
    definition: "L'identifiant d'un sous-arbre d'injection ; toutes les résolutions qui le partagent obtiennent les mêmes instances scoped."
  - term: "forwardRef"
    definition: "Fonction qui retarde la référence à une classe pas encore définie ; permet à Nest de construire deux providers qui dépendent l'un de l'autre."
  - term: "barrel"
    definition: "Un fichier index.ts qui réexporte tout un dossier ; pratique, mais source fréquente d'imports circulaires."
visuals: []
labs: [nest-ch02-l05-lab-ghost-cart]
extra: false
xp: 35
---

> **En une phrase :** `ModuleRef` ouvre une porte dérobée vers le conteneur, et `forwardRef` en ouvre une vers les cycles ; les deux se paient en lisibilité.

## Le problème

`OrdersService` appelle `PaymentsService` pour encaisser. `PaymentsService` rappelle `OrdersService` pour marquer une commande remboursée. Au démarrage :

> Nest can't resolve dependencies of the PaymentsService (?). … A circular dependency between modules…

Nest ne peut construire ni l'un ni l'autre en premier : chacun a besoin que l'autre existe déjà.

## Étape 1 — le contournement : `forwardRef`

```ts
@Injectable()
export class OrdersService {
  constructor(@Inject(forwardRef(() => PaymentsService)) private readonly payments: PaymentsService) {}
}
// … la même chose dans PaymentsService, et entre modules : imports: [forwardRef(() => PaymentsModule)]
```

`forwardRef(() => X)` dit : « ne lis pas `X` maintenant, appelle cette fonction plus tard ». Nest peut alors créer les deux objets, puis les relier. Il faut le mettre **des deux côtés**. L'ordre des constructeurs n'est pas garanti : ne fais rien dans un constructeur qui suppose que l'autre côté est prêt. Et avec un provider REQUEST dans le cycle, des dépendances peuvent rester `undefined`.

## Étape 2 — la vraie correction

Pose la question : **que se disputent ces deux services ?** Ici, ce n'est pas un comportement, c'est une **donnée** : l'état de la commande. Si cet état vit dans un troisième provider dont les deux dépendent, plus personne n'a besoin de l'autre pour le remboursement :

- `OrdersService → PaymentsService → Ledger`
- `OrdersService → Ledger`

Le graphe redevient un arbre. L'autre solution classique est un **événement** (« paiement remboursé »), que `OrdersService` écoute : on la verra au chapitre 09. Dans les deux cas, le couplage que `forwardRef` cachait devient explicite.

Un cycle peut aussi naître **sans que le domaine en ait** : un fichier `cats/index.ts` qui réexporte tout le dossier, et que `cats/cats.controller.ts` importe. Évite les barrels pour les modules et les providers.

## Étape 3 — `ModuleRef`, la porte dérobée

`ModuleRef` (de `@nestjs/core`) donne accès au conteneur depuis un provider :

```ts
constructor(private readonly moduleRef: ModuleRef) {}

this.moduleRef.get(StockService);                    // un singleton du module courant
this.moduleRef.get(StockService, { strict: false }); // cherché dans toute l'application
await this.moduleRef.resolve(CartContext);           // un provider scoped : nouvelle instance
await this.moduleRef.create(ReportBuilder);          // une classe NON enregistrée, avec ses dépendances
```

- `get()` refuse les providers scoped (même implicitement, par contagion) : il lève une erreur.
- `resolve()` construit un **nouveau sous-arbre** à chaque appel. Deux appels donnent deux instances. Pour en partager une, passe le même identifiant : `const id = ContextIdFactory.create(); await moduleRef.resolve(X, id)`. Pendant une requête, `ContextIdFactory.getByRequest(request)` donne le sous-arbre de la requête en cours.

C'est utile pour des cas vraiment dynamiques : choisir un gestionnaire à l'exécution parmi plusieurs, construire un objet à la demande. Mais une dépendance obtenue par `ModuleRef` n'apparaît plus dans la signature du constructeur : un lecteur (ou un test) ne la voit plus.

## Sous le capot

Pourquoi un import circulaire entre **fichiers** casse-t-il l'injection ? Quand `payments.ts` importe `orders.ts` qui importe `payments.ts`, l'un des deux modules ES n'a pas fini de s'évaluer quand l'autre lit sa classe. Au moment où tsc écrit `design:paramtypes`, la classe vaut encore `undefined`. L'injecteur trouve donc `[undefined]` et lève l'erreur « undefined dependency… circular import or missing dependency ».

`forwardRef` contourne exactement ça : l'injecteur stocke la fonction, et ne l'appelle (`resolveParamToken`) qu'au moment de résoudre, quand tous les fichiers sont chargés.

## Pièges fréquents

- **`forwardRef` comme solution définitive.** L'application démarre, le couplage reste.
- **`forwardRef` d'un seul côté.** Le cycle n'est pas cassé.
- **`moduleRef.get()` sur un provider scoped.** Erreur à l'exécution : `resolve()`.
- **`ModuleRef` partout.** Les dépendances deviennent invisibles.

## En production

- Les cycles apparaissent quand un projet grandit. Un outil comme `madge --circular src` les détecte au niveau des fichiers ; mets-le dans la CI.
- Le TP de cette leçon est un **débogage** : un symptôme vague, plusieurs fichiers, aucune erreur dans les logs. C'est la forme que prennent les vrais bugs d'injection.

## À retenir

- Un cycle se contourne avec `forwardRef` des deux côtés ; il se corrige en extrayant ce que les deux côtés partagent.
- Les barrels créent des cycles d'imports sans cycle dans le domaine.
- `ModuleRef.get` pour un singleton, `resolve` (+ `contextId`) pour un provider scoped, `create` pour une classe non enregistrée.
