---
id: ts-ch09-l03
title: "Préférer les types génériques récursifs terminaux"
source: { chapter: 6, pages: "252-256" }
duration_min: 30
concepts:
  - id: ts-recursion-depth
    label: "Un type récursif non terminal est limité en profondeur (environ 50 niveaux) : au-delà, « Type instantiation is excessively deep »"
  - id: ts-tail-recursive-type
    label: "Un type récursif terminal (l'appel récursif est la branche entière, avec un accumulateur) est optimisé jusqu'à environ 1000 niveaux"
  - id: ts-runtime-tail-recursion
    label: "À l'exécution, JavaScript n'optimise presque jamais la récursion terminale (dépassement de pile) : une boucle reste plus sûre"
glossary:
  - term: "récursion terminale"
    definition: "Récursion où l'appel récursif est la dernière opération : rien ne reste à faire avec son résultat, qui est renvoyé tel quel."
  - term: "accumulateur"
    definition: "Paramètre supplémentaire qui transporte le résultat partiel d'un appel récursif au suivant."
visuals: []
labs: [ts-ch09-l03-lab-tail-recursion]
extra: false
xp: 30
---

## Pourquoi c'est important

Les types récursifs (module 08) sont puissants, mais le vérificateur limite leur profondeur. Sur une chaîne un peu longue, un type comme `ToCamel` peut échouer avec « Type instantiation is excessively deep and possibly infinite ». La solution est la même qu'en programmation fonctionnelle : la **récursion terminale**.

## Le concept

### À l'exécution d'abord

```ts
function sum(nums: readonly number[]): number {
  if (nums.length === 0) return 0;
  return nums[0] + sum(nums.slice(1));   // l'addition reste à faire après l'appel
}
sum(Array(10_000).fill(1));   // RangeError: Maximum call stack size exceeded (selon le moteur)
```

Une version **terminale** passe un accumulateur, et l'appel récursif est la dernière opération :

```ts
function sum(nums: readonly number[], acc = 0): number {
  if (nums.length === 0) return acc;
  return sum(nums.slice(1), nums[0] + acc);
}
```

Mais la plupart des moteurs JavaScript (V8 notamment) **n'optimisent pas** la récursion terminale : à l'exécution, une boucle reste la bonne réponse. Au niveau des types, en revanche, TypeScript optimise.

### Au niveau des types

```ts
type GetChars<S extends string> =
  S extends `${infer FirstChar}${infer RestOfString}`
    ? FirstChar | GetChars<RestOfString>
    : never;
type Long = GetChars<'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz…'>;
//          ~~~ Type instantiation is excessively deep and possibly infinite
```

Le résultat récursif est combiné (`FirstChar | …`) après l'appel : la récursion n'est pas terminale, et TypeScript s'arrête vers 50 niveaux. Avec un accumulateur :

```ts
type GetChars<S extends string> = GetCharsHelp<S, never>;
type GetCharsHelp<S extends string, Acc> =
  S extends `${infer FirstChar}${infer RestOfString}`
    ? GetCharsHelp<RestOfString, Acc | FirstChar>
    : Acc;
```

L'appel récursif est **toute** la branche : TypeScript l'optimise et accepte des chaînes bien plus longues (la limite documentée par l'équipe TypeScript est d'environ 1000 niveaux ; le livre ne donne pas de chiffre). Même transformation pour une conversion de casse :

```ts
type ToSnake<T extends string> = string extends T ? string : ToSnakeHelp<T, ''>;
type ToSnakeHelp<T extends string, Acc extends string> =
  T extends `${infer First}${infer Rest}`
    ? ToSnakeHelp<Rest, `${Acc}${First extends Lowercase<First> ? First : `_${Lowercase<First>}`}`>
    : Acc;
```

(Le test `string extends T` évite de calculer quoi que ce soit sur le type `string` lui-même.)

## Pièges fréquents

- **Combiner le résultat récursif** (`X | Rec<…>`, `` `${X}${Rec<…>}` ``) : récursion non terminale, limitée à ~50 niveaux.
- **Croire que la récursion terminale protège à l'exécution** : JavaScript ne l'optimise pas ; utilise une boucle.
- **Des types récursifs sur des entrées non bornées** : même terminaux, ils ont une limite (~1000).

## À retenir

- Un type récursif non terminal est limité à ~50 niveaux.
- Avec un accumulateur, l'appel récursif devient terminal et TypeScript l'optimise.
- À l'exécution, préfère les boucles.
