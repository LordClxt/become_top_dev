---
id: ts-ch01-l01
title: "Penser les types comme des ensembles de valeurs"
source: { chapter: 2, pages: "27-40" }
duration_min: 30
concepts:
  - id: ts-editor-explore
    label: "L'éditeur (tsserver) montre le type déduit, l'affinage et les erreurs : c'est l'outil pour interroger le système de types"
  - id: ts-type-as-set
    label: "Un type est l'ensemble des valeurs qu'il accepte ; un littéral est un singleton, string est infini"
  - id: ts-never-unknown
    label: "never est l'ensemble vide, unknown l'ensemble de toutes les valeurs"
  - id: ts-assignable-subset
    label: "« A est assignable à B » signifie « l'ensemble A est inclus dans l'ensemble B » (sous-type)"
  - id: ts-union-intersection-sets
    label: "| est l'union des ensembles, & leur intersection ; keyof inverse les deux (keyof (A|B) = keyof A & keyof B)"
glossary:
  - term: "tsserver"
    definition: "Le serveur de langage de TypeScript : il alimente l'autocomplétion, le survol et la détection d'erreurs de ton éditeur."
  - term: "sous-type"
    definition: "A est un sous-type de B si toute valeur de A est aussi une valeur de B (A ⊆ B). C'est ce qu'on appelle aussi « assignable à »."
  - term: "type singleton"
    definition: "Type à une seule valeur : le littéral 'A', le nombre 3, true, null, undefined."
visuals: []
labs: [ts-ch01-l01-lab-sets]
extra: false
xp: 30
---

## Pourquoi c'est important

Quand une erreur de type te semble absurde (« Type X is not assignable to type Y » alors que tu vois bien que ça ira), c'est presque toujours que tu raisonnes avec le mauvais modèle. Le bon modèle tient en une phrase : **un type est un ensemble de valeurs**. Une fois qu'on l'a, l'assignabilité, les unions, les intersections, `never` et `unknown` deviennent des mathématiques élémentaires.

## L'éditeur, ton interrogateur

Avant la théorie, l'outil. TypeScript ne se limite pas au compilateur : ton éditeur lance `tsserver`, qui répond à des questions. Survole une variable : il affiche son type déduit. Place le curseur dans un `if` : il montre le type **affiné** à cet endroit. Fais « aller à la définition » sur `fetch` : tu arrives dans `lib.dom.d.ts` et tu vois que `Request` est à la fois un type et une valeur. Utilise le renommage : il suit les types, pas le texte.

```ts
function getElement(elOrId: string | HTMLElement | null): HTMLElement {
  if (typeof elOrId === 'object') {
    return elOrId;   // erreur : elOrId est HTMLElement | null ici
  }
  return document.getElementById(elOrId)!;
}
```

Le survol révèle pourquoi : `typeof null` vaut `'object'` en JavaScript, donc la branche contient encore `null`. Sans l'éditeur, cette erreur est opaque ; avec lui, elle s'explique en un coup d'œil. Prends l'habitude de **survoler avant de deviner**.

## Le concept : des ensembles

À tout instant, une variable TypeScript a un ensemble de valeurs possibles : son type.

- `string` : tous les textes, un ensemble infini ;
- `'A'` : un seul élément, c'est un **singleton** ; `3`, `true`, `null`, `undefined` aussi ;
- `'A' | 'B'` : l'**union**, deux éléments ;
- `never` : l'ensemble **vide**, aucune valeur (le type de ce qui ne se produit jamais) ;
- `unknown` : **toutes** les valeurs.

```ts
type A = 'A';              // {'A'}
type AB = 'A' | 'B';       // {'A', 'B'}
const a: A = 'A';          // OK : 'A' ∈ {'A'}
const b: AB = 'B';         // OK
const c: A = 'B';          // erreur : 'B' ∉ {'A'}
```

### « Assignable à » = « inclus dans »

`const x: B = valeur` est accepté si l'ensemble de `valeur` est **inclus** dans celui de `B`. C'est tout. Le mot « sous-type » signifie « sous-ensemble ».

```ts
const ab: AB = a;     // OK : {'A'} ⊆ {'A','B'}
const a2: A = ab;     // erreur : {'A','B'} ⊄ {'A'}
```

Conséquences : `never` est assignable à tout (le vide est inclus partout) ; tout est assignable à `unknown` (l'univers contient tout).

### Union et intersection

`|` est l'union : plus de valeurs. `&` est l'**intersection** : seulement ce qui appartient aux deux. Pour des types objets, c'est contre-intuitif au premier regard :

```ts
interface Person { name: string }
interface Lifespan { birth: Date; death?: Date }
type PersonSpan = Person & Lifespan;
```

Une valeur de `PersonSpan` doit être à la fois un `Person` **et** un `Lifespan` : elle a donc `name` **et** `birth`. L'intersection d'ensembles produit des objets avec **plus** de propriétés. C'est pourquoi les propriétés se cumulent.

Les clés suivent la règle inverse :

```ts
type K1 = keyof (Person & Lifespan);   // 'name' | 'birth' | 'death'  (union)
type K2 = keyof (Person | Lifespan);   // never  (intersection des clés : aucune en commun)
```

Autre exemple, la différence : `Exclude<string | Date, string | number>` vaut `Date` (on retire de l'ensemble de gauche ce qui est dans celui de droite).

### Les tuples et les tableaux

```ts
const list = [1, 2];
const pair: [number, number] = list;   // erreur : number[] n'est pas assignable à [number, number]
const triple: [number, number, number] = [1, 2, 3];
const pair2: [number, number] = triple; // erreur : length vaut 3, pas 2
```

`number[]` contient des listes de toute longueur, donc aussi des paires et d'autres choses : ce n'est pas un sous-ensemble de « paires ». Et un triplet n'est pas une paire, parce que `length` est un `3` littéral.

## Pièges fréquents

- **Raisonner en héritage plutôt qu'en inclusion** : un `Square` n'a pas besoin de « dériver » de `Shape` pour y être assignable.
- **Prendre `&` sur des objets pour une restriction** : l'intersection d'ensembles de valeurs est plus petite, mais chaque valeur a **plus** de propriétés.
- **Oublier que `readonly` ne change pas l'ensemble de valeurs** : `readonly number[]` a les mêmes valeurs que `number[]`, mais d'autres opérations permises (module 02).
- **Deviner au lieu de survoler** : le type déduit est visible dans l'éditeur.

## À retenir

- Un type est un ensemble de valeurs ; `never` est vide, `unknown` est tout, les littéraux sont des singletons.
- « Assignable à » signifie « sous-ensemble de ».
- `|` est l'union, `&` l'intersection ; `keyof` échange les deux.
- `number[]` n'est pas assignable à un tuple ; un tuple plus long n'est pas assignable à un tuple plus court.
- Interroge le système de types avec l'éditeur avant de le soupçonner d'avoir tort.
