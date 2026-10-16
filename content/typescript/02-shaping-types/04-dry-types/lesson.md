---
id: ts-ch02-l04
title: "Ne pas se répéter dans les types"
source: { chapter: 2, pages: "72-80" }
duration_min: 30
concepts:
  - id: ts-dry-named-extends
    label: "Nommer les types répétés, factoriser les propriétés communes avec extends ou une intersection"
  - id: ts-pick-mapped
    label: "Pick<T, K> et les types mappés ([K in keyof T]) dérivent un sous-ensemble ou une variante d'un type existant"
  - id: ts-partial-homomorphic
    label: "Partial<T> et les mapped types homomorphes préservent readonly et optionnel ; on peut renommer les clés avec `as`"
  - id: ts-typeof-returntype-derive
    label: "typeof valeur, ReturnType<typeof f> et Action['type'] dérivent un type de ce qui existe déjà"
  - id: ts-dry-overdo
    label: "Il ne faut pas sur-factoriser : deux choses qui se ressemblent par hasard ne doivent pas partager un type"
glossary:
  - term: "type mappé (mapped type)"
    definition: "Type construit en parcourant les clés d'un autre : { [K in keyof T]: … }. Pick, Partial, Readonly en sont."
  - term: "homomorphe"
    definition: "Se dit d'un type mappé de la forme [K in keyof T] : il conserve les modificateurs (readonly, ?) et la documentation des propriétés de T."
visuals: []
labs: [ts-ch02-l04-lab-dry-types]
extra: false
xp: 30
---

## Pourquoi c'est important

Le principe DRY (*Don't Repeat Yourself*) s'applique aux types autant qu'au code. Des types dupliqués se désynchronisent : on ajoute un champ à l'un, on oublie l'autre, et le vérificateur ne peut plus rien dire. TypeScript offre de quoi **dériver** un type d'un autre.

Un exemple de départ :

```ts
interface Person { firstName: string; lastName: string }
interface PersonWithBirthDate { firstName: string; lastName: string; birth: Date }
```

## Le concept

### 1. Nommer et étendre

Une répétition de signature se nomme :

```ts
function distance(a: { x: number; y: number }, b: { x: number; y: number }) {}
// devient
interface Point2D { x: number; y: number }
function distance(a: Point2D, b: Point2D) {}
```

Pour les propriétés communes à deux types, `extends` (ou `&`) :

```ts
interface PersonWithBirthDate extends Person { birth: Date }
```

### 2. Pick et les types mappés

Souvent un type est un **sous-ensemble** d'un autre :

```ts
interface State { userId: string; pageTitle: string; recentFiles: string[]; pageContents: string }
type TopNavState = { userId: string; pageTitle: string; recentFiles: string[] };   // recopié, fragile
```

Dérive-le. D'abord à la main avec un **type mappé** :

```ts
type TopNavState = { [K in 'userId' | 'pageTitle' | 'recentFiles']: State[K] };
```

`[K in …]` parcourt les clés listées, et `State[K]` en lit le type. C'est exactement ce que fait le type utilitaire `Pick` :

```ts
type TopNavState = Pick<State, 'userId' | 'pageTitle' | 'recentFiles'>;
```

### 3. Partial, Readonly et les mapped types homomorphes

Une variante « toutes les clés optionnelles » :

```ts
type OptionsUpdate = { [K in keyof Options]?: Options[K] };   // = Partial<Options>
```

Les types mappés de la forme `[K in keyof T]` sont dits **homomorphes** : ils conservent `readonly`, `?` et les commentaires de documentation des propriétés. D'où `Partial<number>` qui vaut `number` (rien à rendre optionnel). On peut aussi **renommer** les clés avec `as` :

```ts
type Flip<T extends Record<string, string>> = { [K in keyof T as T[K]]: K };
```

### 4. Dériver depuis une valeur ou une fonction

```ts
const INIT_OPTIONS = { width: 640, height: 480, color: '#00FF00', label: 'VGA' };
type Options = typeof INIT_OPTIONS;                       // pas de duplication de la constante

function getUserInfo(userId: string) { return { userId, name: 'x', age: 30 }; }
type UserInfo = ReturnType<typeof getUserInfo>;           // le type que renvoie la fonction

interface SaveAction { type: 'save'; payload: string }
interface LoadAction { type: 'load'; id: number }
type Action = SaveAction | LoadAction;
type ActionType = Action['type'];                          // 'save' | 'load' : pas besoin de le recopier
```

Pour `Action['type']`, retiens la différence avec `Pick<Action, 'type'>` : le premier est l'union des **valeurs** de `type`, le second un objet `{ type: … }`.

### 5. Ne pas sur-factoriser

Deux types qui se ressemblent aujourd'hui n'évolueront pas forcément ensemble :

```ts
interface Product { id: number; name: string; priceDollars: number }
interface Customer { id: number; name: string; address: string }
// Tentation : interface NamedAndIdentified { id: number; name: string }
```

Un `Product` et un `Customer` ont chacun un `id` et un `name`, mais ce n'est pas la même idée : partager un type crée un couplage qui coûtera le jour où l'un d'eux change. **Factorise ce qui est la même chose, pas ce qui se ressemble.**

## Pièges fréquents

- **Dupliquer un sous-ensemble de champs** au lieu d'utiliser `Pick`.
- **Écrire deux fois la forme d'une constante** : `typeof`.
- **Sur-factoriser** deux types qui n'ont qu'une ressemblance accidentelle.
- **Confondre `Action['type']` et `Pick<Action, 'type'>`**.

## À retenir

- Nomme les types répétés ; utilise `extends` pour les propriétés communes.
- `Pick`, `Partial`, `Readonly` et les types mappés dérivent des variantes sans recopie ; les homomorphes gardent `readonly` et `?`.
- `typeof`, `ReturnType`, `T['clé']` tirent le type de ce qui existe.
- Ne factorise que ce qui est vraiment la même chose.
