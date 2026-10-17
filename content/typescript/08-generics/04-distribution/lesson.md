---
id: ts-ch08-l04
title: "Contrôler la distribution des unions sur les types conditionnels"
source: { chapter: 6, pages: "230-234" }
duration_min: 30
concepts:
  - id: ts-distributive-conditional
    label: "Un type conditionnel sur un paramètre nu (T extends …) est distributif : il s'applique à chaque membre d'une union séparément"
  - id: ts-non-distributive
    label: "Envelopper les deux côtés dans un tuple ([T] extends [U]) désactive la distribution"
  - id: ts-boolean-never-distribution
    label: "boolean est l'union true | false (donc il distribue), et F<never> vaut never pour un conditionnel distributif"
  - id: ts-force-distribution
    label: "Pour distribuer un type qui ne le fait pas (un accumulateur récursif), on ajoute N extends number ? … : never"
glossary:
  - term: "type conditionnel distributif"
    definition: "Type conditionnel dont le type testé est un paramètre générique nu : il est évalué membre par membre sur une union."
visuals: []
labs: [ts-ch08-l04-lab-distribution]
extra: false
xp: 30
---

## Pourquoi c'est important

La distribution des types conditionnels sur les unions est presque toujours ce qu'on veut (c'est elle qui rend `double(x: string | number)` correct). Mais parfois elle produit des résultats surprenants. Il faut savoir l'activer et la désactiver.

## Le concept

### La distribution par défaut

```ts
type Comparable<T> =
  T extends Date ? Date | number :
  T extends number ? number :
  T extends string ? string :
  never;

declare function isLessThan<T>(a: T, b: Comparable<T>): boolean;

let dateOrStr = Math.random() < 0.5 ? new Date() : 'A';
isLessThan(dateOrStr, 'B');   // accepté… comparer une Date à 'B' ?
```

`Comparable<Date | string>` distribue : `Comparable<Date> | Comparable<string>` = `Date | number | string`. Une `Date` comparée à une chaîne passe. Ici, on voudrait que l'union entière soit testée.

### Désactiver la distribution

La distribution ne s'applique que lorsque le type testé est un **paramètre nu**. Il suffit de l'envelopper dans un tuple :

```ts
type Comparable<T> =
  [T] extends [Date] ? Date | number :
  [T] extends [number] ? number :
  [T] extends [string] ? string :
  never;

isLessThan(dateOrStr, 'B');
//                    ~~~ Argument of type 'string' is not assignable to parameter of type 'never'
```

### Les cas surprenants : boolean et never

```ts
type CelebrateIfTrue<V> = V extends true ? 'Huzzah!' : never;
type Party = CelebrateIfTrue<boolean>;   // 'Huzzah!'
```

`boolean` est l'union `true | false` : le conditionnel distribue, donne `'Huzzah!' | never` = `'Huzzah!'`. Avec `[V] extends [true]`, on obtient `never`.

Et `never` est l'union **vide** : un conditionnel distributif sur `never` donne toujours `never`, sans évaluer aucune branche. Pour tester `never`, il faut `[T] extends [never]`.

### Forcer la distribution

Parfois c'est l'inverse : un type récursif à accumulateur ne distribue pas.

```ts
type NTuple<T, N extends number> = NTupleHelp<T, N, []>;
type NTupleHelp<T, N extends number, Acc extends unknown[]> =
  Acc['length'] extends N ? Acc : NTupleHelp<T, N, [T, ...Acc]>;

type PairOrTriple = NTuple<bigint, 2 | 3>;   // [bigint, bigint] seulement !
```

Ici, le type testé est `Acc['length']`, pas un paramètre nu : pas de distribution sur `N`. On la force avec un conditionnel trivial sur `N` :

```ts
type NTuple<T, N extends number> = N extends number ? NTupleHelp<T, N, []> : never;
type PairOrTriple = NTuple<bigint, 2 | 3>;   // [bigint, bigint] | [bigint, bigint, bigint]
```

## Pièges fréquents

- **Un conditionnel qui « accepte trop »** sur une union : vérifie s'il distribue.
- **`IsTrue<boolean>`, `IsNever<never>`** : la distribution donne des résultats contre-intuitifs.
- **Un type récursif qui ignore une partie d'une union** : force la distribution.

## À retenir

- `T extends …` sur un paramètre nu distribue sur les unions.
- `[T] extends [U]` désactive la distribution.
- `boolean` distribue, `never` donne `never` ; `N extends number ? … : never` force la distribution.
