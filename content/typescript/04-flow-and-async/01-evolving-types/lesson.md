---
id: ts-ch04-l01
title: "Les types évolutifs"
source: { chapter: 3, pages: "119-123" }
duration_min: 20
concepts:
  - id: ts-evolving-array
    label: "Un tableau déclaré vide (const xs = []) a un type évolutif : any[] qui devient number[] (puis (string | number)[]) au fil des push"
  - id: ts-evolving-let
    label: "Une variable déclarée sans valeur ou à null (let v = null) évolue selon les affectations, par exemple dans un try/catch"
  - id: ts-evolving-limits
    label: "Lire un type évolutif avant toute écriture déclenche une erreur implicit any, et l'évolution ne traverse pas les callbacks (forEach)"
glossary:
  - term: "type évolutif (evolving any)"
    definition: "Type d'une variable ou d'un tableau initialisé sans information, que TypeScript précise au fil des affectations (avec noImplicitAny)."
visuals: []
labs: [ts-ch04-l01-lab-evolving]
extra: false
xp: 20
---

## Pourquoi c'est important

Le module 03 l'a montré : le type d'une variable est fixé à sa déclaration. Il y a une exception, utile au quotidien : quand tu déclares un **tableau vide** ou une variable **sans valeur**, TypeScript laisse le type **évoluer** au fil des affectations. Savoir quand ce mécanisme s'applique t'évite des annotations inutiles, et des surprises.

## Le concept

### Les tableaux vides

```ts
function range(start: number, limit: number) {
  const nums = [];          // any[]
  for (let i = start; i < limit; i++) {
    nums.push(i);           // any[]
  }
  return nums;              // number[]
}
```

Le type de retour inféré est `number[]` : TypeScript a suivi les `push`. Si tu pousses ensuite une chaîne, le type devient `(string | number)[]`. Ce n'est **pas** un `any` contagieux : avec `noImplicitAny`, chaque `push` précise le type.

### Les variables sans valeur

```ts
let value;               // any
if (Math.random() < 0.5) {
  value = /hello/;       // RegExp
} else {
  value = 12;            // number
}
value;                   // number | RegExp
```

Même chose avec `let value = null`, typique d'un `try/catch` :

```ts
let result = null;
try {
  result = expensiveComputation();   // number
} catch (e) {
  console.warn('échec');
}
result;                              // number | null
```

### Les limites

**Lire avant d'écrire** est une erreur :

```ts
const out = [];
//    ~~~ Variable 'out' implicitly has type 'any[]' in some locations…
if (out.length === 0) { … }   // lecture d'un any[] : refusée
```

**Les callbacks n'y participent pas** :

```ts
function makeSquares(start: number, limit: number) {
  const out = [];
  range(start, limit).forEach((i) => { out.push(i * i); });
  return out;
  //     ~~~ implicitly has an 'any[]' type
}
```

Préfère une boucle `for-of`, ou mieux, une construction fonctionnelle : `return range(start, limit).map((i) => i * i);` (leçon suivante).

Enfin, une annotation explicite **désactive** l'évolution. `const xs: unknown[] = []` reste `unknown[]`. Si tu veux un type précis dès le départ, annote : c'est plus lisible qu'un type qui « apparaît » au fil du code.

## Pièges fréquents

- **Lire le tableau avant le premier push** : erreur `implicit any`.
- **Remplir dans un `forEach`** : l'évolution est perdue ; utilise `for-of` ou `map`.
- **Compter sur un type évolutif dans une API publique** : annote le retour (module 03).

## À retenir

- Un tableau vide ou une variable sans valeur ont un type qui évolue avec les affectations.
- L'évolution ne traverse pas les callbacks et refuse les lectures prématurées.
- Pour un type stable et lisible, annote, ou utilise `map` / `filter`.
