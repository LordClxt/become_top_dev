---
id: nest-ch02-l01
title: "Providers et jetons"
source: { chapter: 12, pages: "#di-fundamentals, #custom-providers ; /providers#optional-providers ; /fundamentals/async-providers", url: "https://docs.nestjs.com/fundamentals/custom-providers" }
duration_min: 40
concepts:
  - id: nest-provider-tokens
    label: "Le conteneur associe un jeton (classe, string, Symbol) à une recette ; une interface n'est pas un jeton, une classe abstraite si"
  - id: nest-custom-providers
    label: "Quatre recettes : useClass, useValue, useFactory (+ inject), useExisting (alias de la même instance)"
  - id: nest-async-providers
    label: "Une useFactory async retarde l'instanciation de ses dépendants jusqu'à la résolution de la promesse"
  - id: nest-optional-deps
    label: "@Optional() injecte undefined si le jeton est absent ; la classe gère alors la valeur par défaut"
glossary:
  - term: "jeton (token)"
    definition: "La clé sous laquelle un provider est enregistré et demandé : une classe, une chaîne, un Symbol ou une classe abstraite."
  - term: "recette"
    definition: "Ce que le conteneur fait pour produire la valeur d'un jeton : instancier une classe, rendre une valeur, appeler une fabrique ou renvoyer un autre jeton."
  - term: "alias"
    definition: "Un jeton (useExisting) qui pointe vers un autre jeton : les deux donnent la même instance."
visuals: [nest-ch02-provider-recipes]
labs: [nest-ch02-l01-lab-warmup-config, nest-ch02-l01-lab-payment-wiring]
extra: false
xp: 30
---

> **En une phrase :** le conteneur de Nest est un dictionnaire « jeton → recette » ; tu choisis la clé, et la façon de fabriquer la valeur.

## Le problème

La librairie doit encaisser des paiements. En production, on appelle la vraie passerelle ; dans les tests, une fausse, qui ne débite personne. Le service de commande, lui, ne doit pas changer selon le cas : il veut « une passerelle », point.

Tu as déjà injecté des classes : `constructor(private books: BooksService)`. Mais comment injecter une passerelle **choisie selon la configuration**, ou une simple chaîne comme le nom de la boutique ? Et pourquoi Nest refuse-t-il parfois de démarrer avec « can't resolve dependencies » ?

## L'idée : un vestiaire

Imagine un vestiaire. Tu déposes un manteau, on te donne un **ticket**. Plus tard, tu tends le ticket et tu récupères le manteau.

- Le **ticket**, c'est le **jeton** : la clé que le consommateur présente.
- La façon de préparer le manteau, c'est la **recette** : Nest peut le fabriquer (instancier une classe), te rendre un objet déposé tel quel, appeler une fonction, ou te renvoyer au ticket d'un autre manteau.

Quand tu écris `providers: [BooksService]`, Nest comprend :

```ts
providers: [{ provide: BooksService, useClass: BooksService }]
//            ^ le ticket            ^ la recette : « fabrique un BooksService »
```

Il le fabrique **une fois**, le garde, et le redonne à chaque demande : c'est la portée **singleton**, celle par défaut.

::visual{id="nest-ch02-provider-recipes"}

## Étape 1 — une valeur toute faite : `useValue`

Le nom de la boutique est une chaîne. Il n'y a rien à instancier : on le dépose tel quel.

```ts
export const SHOP_NAME = Symbol('SHOP_NAME');   // le ticket

@Module({ providers: [{ provide: SHOP_NAME, useValue: 'La Page Tournée' }, GreetingService] })
export class ShopModule {}

@Injectable()
export class GreetingService {
  constructor(@Inject(SHOP_NAME) private readonly shopName: string) {}
}
```

Pourquoi `@Inject(SHOP_NAME)` ? Parce que Nest devine le jeton à partir du **type** du paramètre. Ici le type est `string` : à l'exécution, tsc écrit `String`, et ce n'est pas un jeton enregistré. `@Inject` dit explicitement quel ticket présenter.

`useValue` sert aussi à remplacer un service par un faux dans un test : un objet littéral qui a les bonnes méthodes suffit.

**À toi :** le TP d'échauffement ne demande que ça.

## Étape 2 — un jeton qui n'est pas une classe

Rappel du chapitre 00 : une `interface` disparaît à la compilation. Dans `design:paramtypes`, elle devient `Object`, et Nest ne trouve rien. Pour un contrat décrit par une interface, il faut un jeton qui existe à l'exécution :

```ts
export interface ShopConfig { currency: string }
export const SHOP_CONFIG = Symbol('SHOP_CONFIG');
// injection : @Inject(SHOP_CONFIG) private readonly config: ShopConfig
```

Pourquoi un `Symbol` plutôt que la chaîne `'SHOP_CONFIG'` ? Deux bibliothèques qui choisissent la même chaîne entrent en collision sans aucun message. Deux `Symbol('SHOP_CONFIG')` sont toujours différents.

Il existe une troisième voie, souvent la meilleure pour un service : la **classe abstraite**. Elle existe à l'exécution, donc elle sert à la fois de type et de jeton, sans `@Inject` :

```ts
export abstract class PaymentGateway {
  abstract charge(amountCents: number): Promise<string>;
}
// providers: [{ provide: PaymentGateway, useClass: StripeGateway }]
constructor(private readonly gateway: PaymentGateway) {}
```

| Jeton | `@Inject` nécessaire | Collision possible | Quand |
|---|---|---|---|
| Classe concrète | non | non | le cas courant |
| Classe abstraite | non | non | un contrat, plusieurs implémentations |
| `Symbol` | oui | non | valeurs, configuration |
| Chaîne | oui | **oui** | à éviter |

## Étape 3 — choisir l'implémentation : `useFactory`

Revenons à la passerelle. Le choix dépend de la configuration. Une **fabrique** est une fonction qui reçoit d'autres providers et renvoie la valeur :

```ts
{
  provide: PaymentGateway,
  useFactory: (config: PaymentsConfig) => config.mode === 'live' ? new LiveGateway() : new FakeGateway(),
  inject: [PAYMENTS_CONFIG],   // les arguments, DANS L'ORDRE des paramètres
}
```

Pourquoi pas `useClass: process.env.MODE === 'live' ? LiveGateway : FakeGateway` ? Ça fonctionne, mais l'expression est évaluée **une seule fois, au chargement du fichier**. Un test ne peut plus changer le mode. Avec la fabrique, le mode vient d'un provider ; un test le remplace par `overrideProvider(PAYMENTS_CONFIG).useValue({ mode: 'live' })`.

**Asynchrone.** Si la fabrique renvoie une promesse (ouvrir une connexion, charger des taux de change), Nest **attend** avant de construire ceux qui en dépendent. Ils reçoivent la valeur, jamais la promesse. C'est ainsi qu'une API refuse de démarrer tant que la base n'est pas joignable.

## Étape 4 — deux noms, un seul objet : `useExisting`

Un vieux module demande la passerelle sous le nom `'LEGACY_GATEWAY'`. Tu veux lui donner **la même** passerelle :

```ts
{ provide: 'LEGACY_GATEWAY', useExisting: PaymentGateway }
```

Avec `useClass: FakeGateway` à la place, tu obtiendrais une **seconde** passerelle, avec son propre état (ses compteurs, ses connexions). C'est un bug silencieux classique.

## Étape 5 — une dépendance facultative : `@Optional()`

```ts
constructor(@Optional() @Inject(AUDIT_SINK) private readonly audit?: AuditSink) {}
// plus loin : this.audit?.record(receipt);
```

Si rien n'est enregistré sous `AUDIT_SINK`, Nest injecte `undefined` au lieu de refuser de démarrer. C'est à la classe de gérer l'absence.

## Sous le capot

Ce que fait réellement l'injecteur de Nest (`@nestjs/core`, fichier `injector/injector.js`) quand il construit une classe :

1. Il lit `design:paramtypes`, la liste des types que tsc a écrite pour le constructeur : par exemple `[Object, BooksService]`.
2. Il lit `self:paramtypes`, ce que les `@Inject(...)` ont enregistré : `[{ index: 0, param: SHOP_CONFIG }]`. Il **remplace** les entrées à ces positions. On obtient `[SHOP_CONFIG, BooksService]`.
3. Pour chaque jeton, il cherche le provider dans le module courant, puis dans les exports des modules importés (leçon suivante). S'il trouve, il le construit d'abord (la résolution est récursive), puis appelle le constructeur.
4. Il range l'instance dans l'enveloppe du provider (une `InstanceWrapper`), sous un contexte « statique ». Les demandes suivantes repartent avec cette instance.

Deux conséquences pratiques :
- Si une entrée de la liste est `undefined` (par exemple à cause d'un import circulaire entre fichiers, leçon 5), l'erreur dit explicitement : « undefined dependency… circular import or missing dependency ».
- `@Inject` ne fait rien d'autre qu'écrire dans `self:paramtypes`. Ce n'est pas magique : tu pourrais écrire toi-même cette métadonnée.

Quand une résolution échoue, relance avec `NEST_DEBUG=1` : Nest affiche chaque étape. Le message d'erreur donne l'**index** du paramètre fautif et le **module** où il a cherché ; c'est presque toujours suffisant.

## Pièges fréquents

- **Un alias fait avec `useClass`.** Deux instances, deux états.
- **`inject` dans le désordre.** Les arguments arrivent par position, pas par type ; deux dépendances du même type inversées compilent sans broncher.
- **Le choix d'implémentation figé à l'import.** Préfère une fabrique qui reçoit la configuration par injection.
- **Une interface sans `@Inject`.** `design:paramtypes` contient `Object`, le démarrage échoue.

## En production

- Valide la configuration **dans la fabrique** : une passerelle mal configurée doit faire échouer le démarrage, pas le premier paiement.
- Un provider asynchrone retarde le démarrage : mets un délai maximal à la connexion, sinon un orchestrateur (Kubernetes, Coolify) verra un conteneur qui ne répond jamais.

## À retenir

- Un provider = un jeton + une recette ; `providers: [X]` est un raccourci pour `useClass: X`.
- `useValue` pour une valeur, `useClass` pour une implémentation, `useFactory` + `inject` pour une construction (éventuellement asynchrone), `useExisting` pour un alias.
- Interface → `Symbol` + `@Inject` ; classe abstraite → contrat et jeton à la fois.
- L'injecteur lit `design:paramtypes`, les `@Inject` en remplacent des positions, et l'instance est mise en cache.
