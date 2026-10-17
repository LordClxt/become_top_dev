---
id: ts-ch08-l02
title: "Éviter les paramètres de type inutiles"
source: { chapter: 6, pages: "221-227" }
duration_min: 25
concepts:
  - id: ts-golden-rule-generics
    label: "Règle d'or : un paramètre de type doit apparaître au moins deux fois (il relie deux types) ; sinon, il est inutile"
  - id: ts-return-only-param
    label: "Un paramètre de type qui n'apparaît que dans le retour (parseYAML<T>) est une assertion déguisée"
  - id: ts-useful-param
    label: "getProperty<T, K extends keyof T>(obj: T, key: K): T[K] utilise K deux fois (paramètre et retour) : il est utile ; printProperty n'en a pas besoin"
  - id: ts-simplify-generic
    label: "Un paramètre utilisé une fois se remplace par son type (unknown, keyof T, ArrayLike<unknown>) ; une classe générique inutile devient une fonction"
glossary:
  - term: "règle d'or des génériques"
    definition: "Un paramètre de type doit apparaître au moins deux fois dans une signature (déclaration exceptée), pour relier les types de deux éléments."
visuals: []
labs: [ts-ch08-l02-lab-golden-rule]
extra: false
xp: 25
---

## Pourquoi c'est important

Après avoir découvert les génériques, on en met partout. Mais un paramètre de type inutile n'apporte rien : il complique la signature, et parfois il **ment** en donnant l'illusion d'une vérification. Une règle simple permet de les repérer.

## Le concept

### La règle d'or

> Un paramètre de type doit apparaître **au moins deux fois**.

Un générique sert à **relier** des types : le type du paramètre et celui du retour, ou ceux de deux paramètres. S'il n'apparaît qu'une fois, il ne relie rien.

```ts
function identity<T>(arg: T): T { return arg; }   // T deux fois : relie entrée et sortie

function third<A, B, C>(a: A, b: B, c: C): C { return c; }
// A et B n'apparaissent qu'une fois : inutiles
function third<C>(a: unknown, b: unknown, c: C): C { return c; }
```

### Le paramètre de retour seul

```ts
declare function parseYAML<T>(input: string): T;
const w = parseYAML<Weight>('');   // aucune vérification : une assertion déguisée
```

`T` n'apparaît qu'une fois (dans le retour). Renvoie `unknown` (module 07) : l'appelant écrit `as Weight`, ce qui est honnête.

### Un paramètre utile ou non ?

```ts
function printProperty<T, K extends keyof T>(obj: T, key: K) {
  console.log(obj[key]);
}
```

`K` n'apparaît qu'une fois (la contrainte ne compte pas comme un usage de K, elle mentionne T) : `function printProperty<T>(obj: T, key: keyof T)` suffit. En revanche :

```ts
function getProperty<T, K extends keyof T>(obj: T, key: K) {
  return obj[key];   // le retour inféré est T[K] : K apparaît deux fois
}
```

Ici, `K` relie la clé passée et le type de retour : `getProperty(user, 'age')` renvoie un `number` précis.

### Autres simplifications

```ts
interface Lengthy { length: number }
function getLength<T extends Lengthy>(x: T) { return x.length; }   // T une seule fois
function getLength(x: Lengthy) { return x.length; }                // suffit
function getLength(x: ArrayLike<unknown>) { return x.length; }      // ou un type standard
```

Une classe générique dont le paramètre ne sert qu'à une méthode peut devenir une méthode générique… ou une simple fonction :

```ts
class Joiner<T extends string | number> { join(els: T[]) { return els.map(String).join(','); } }
function join(els: readonly (string | number)[]) { return els.map(String).join(','); }
```

Le lint `no-unnecessary-type-parameters` de typescript-eslint repère ces cas.

## Pièges fréquents

- **Un paramètre de type par argument** « au cas où ».
- **`load<T>(): T`** : un retour générique seul est une assertion cachée.
- **Confondre contrainte et usage** : `K extends keyof T` ne compte pas comme un usage de `K`.

## À retenir

- Un paramètre de type doit apparaître au moins deux fois pour relier des types.
- Remplace un paramètre utilisé une fois par son type (`unknown`, `keyof T`, `ArrayLike<unknown>`).
- Un générique de retour seul : renvoie `unknown`.
