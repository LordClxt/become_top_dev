---
id: ts-ch08-l03
title: "Des types conditionnels plutôt que des surcharges"
source: { chapter: 6, pages: "227-230" }
duration_min: 30
concepts:
  - id: ts-overload-limits
    label: "Les surcharges sont examinées une par une : un argument de type union (string | number) ne correspond à aucune et l'appel est refusé"
  - id: ts-conditional-type
    label: "Un type conditionnel (T extends string ? string : number) calcule le type de retour à partir du type d'entrée, y compris pour les unions"
  - id: ts-single-overload-impl
    label: "On implémente une fonction à type conditionnel avec une seule signature de surcharge publique et une implémentation plus large, au lieu d'assertions"
  - id: ts-infer-keyword
    label: "infer capture une partie d'un type dans un type conditionnel (T extends Promise<infer U> ? U : T)"
glossary:
  - term: "type conditionnel"
    definition: "Type de la forme `A extends B ? X : Y` : X si A est assignable à B, sinon Y, évalué à la compilation."
  - term: "surcharge"
    definition: "Plusieurs signatures déclarées pour une même fonction, suivies d'une seule implémentation."
visuals: []
labs: [ts-ch08-l03-lab-conditional]
extra: false
xp: 30
---

## Pourquoi c'est important

Quand le type de retour d'une fonction dépend du type de son argument, on pense d'abord aux surcharges. Elles marchent… jusqu'au jour où on passe une union. Les types conditionnels expriment la même relation, mais pour **tous** les cas.

## Le concept

### Le problème

```ts
function double(x: string | number) {
  return x + x;
}
const num = double(12);    // string | number
const str = double('x');   // string | number
```

Le type de retour est trop large. Un générique ?

```ts
function double<T extends string | number>(x: T): T;
const num = double(12);    // 12 !
const str = double('x');   // "x" !
```

Trop précis, et faux : `double('x')` vaut `'xx'`, pas `'x'`. Les surcharges :

```ts
function double(x: number): number;
function double(x: string): string;
function double(x: string | number) { return x + x; }

const num = double(12);    // number
const str = double('x');   // string

function f(x: string | number) {
  return double(x);
  //            ~ No overload matches this call
}
```

Les surcharges sont essayées **une par une** ; une union ne correspond à aucune.

### Le type conditionnel

```ts
function double<T extends number | string>(x: T): T extends string ? string : number;
```

C'est un `if` au niveau des types. Et sur une union, il **distribue** : `(string | number) extends string ? …` est évalué membre par membre et donne `string | number`. Les trois cas sont justes :

```ts
double(12);                  // number
double('x');                 // string
double(x as string | number); // string | number
```

### L'implémentation

TypeScript ne sait pas vérifier qu'une implémentation renvoie bien un type conditionnel. Plutôt qu'une assertion dans chaque `return`, on déclare **une** signature publique et une implémentation plus large :

```ts
function double<T extends number | string>(x: T): T extends string ? string : number;
function double(x: string | number): string | number {
  return typeof x === 'string' ? x + x : x + x;
}
```

L'implémentation n'est pas visible des appelants : seule la signature conditionnelle l'est.

### infer

Un type conditionnel peut **capturer** une partie du type testé :

```ts
type Unwrap<T> = T extends Promise<infer U> ? U : T;
type A = Unwrap<Promise<number>>;   // number
type B = Unwrap<string>;            // string
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;
```

C'est ainsi que sont définis `ReturnType`, `Parameters` ou `Awaited`.

Si les deux cas d'une fonction n'ont rien en commun, mieux vaut parfois **deux fonctions** distinctes qu'un type conditionnel compliqué.

## Pièges fréquents

- **Des surcharges pour une relation entrée-sortie** : elles refusent les unions.
- **Un générique qui renvoie `T`** alors que la valeur change (`'x'` devient `'xx'`).
- **Des `as` dans chaque branche** de l'implémentation : une seule signature de surcharge suffit.

## À retenir

- Pour un type de retour qui dépend du type d'entrée, préfère un type conditionnel aux surcharges.
- Les types conditionnels distribuent sur les unions.
- Implémente avec une signature publique conditionnelle et une implémentation plus large ; `infer` capture une partie d'un type.
