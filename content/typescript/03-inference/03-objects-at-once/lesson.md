---
id: ts-ch03-l03
title: "Créer les objets d'un coup"
source: { chapter: 3, pages: "104-106" }
duration_min: 20
concepts:
  - id: ts-object-all-at-once
    label: "Le type d'un objet est fixé à sa création : construire {} puis ajouter des propriétés est refusé ; on crée l'objet d'un coup"
  - id: ts-spread-compose
    label: "La décomposition ({ ...a, ...b }) construit un objet plus grand en une expression, avec un type correct"
  - id: ts-conditional-spread
    label: "...(cond ? { k: v } : {}) ajoute une propriété sous condition et produit une propriété optionnelle"
glossary:
  - term: "décomposition (spread)"
    definition: "Syntaxe `...obj` qui copie les propriétés propres et énumérables d'un objet dans un nouveau littéral."
visuals: []
labs: [ts-ch03-l03-lab-spread]
extra: false
xp: 20
---

## Pourquoi c'est important

En JavaScript, on construit souvent un objet par petits bouts : `const pt = {}; pt.x = 3; pt.y = 4;`. En TypeScript, ça ne marche pas : **le type d'une variable est fixé à sa déclaration**, et `{}` n'a aucune propriété. La solution idiomatique est de créer l'objet **en une seule expression**.

## Le concept

### Le problème

```ts
const pt = {};
pt.x = 3;
// ~ Property 'x' does not exist on type '{}'
```

Annoter `const pt: Point = {}` ne fait que déplacer l'erreur (`x` et `y` manquent). L'assertion `const pt = {} as Point` fait taire TypeScript, mais si tu oublies `pt.y = 4`, personne ne te prévient : c'est un mensonge.

La bonne réponse : `const pt: Point = { x: 3, y: 4 };`.

### Composer avec la décomposition

Pour bâtir un objet à partir d'autres, la décomposition fait tout en une expression :

```ts
const pt = { x: 3, y: 4 };
const id = { name: 'Pythagoras' };
const namedPoint = { ...pt, ...id };   // { name: string; x: number; y: number }
```

Pour construire par étapes, crée **une nouvelle variable** à chaque étape : chacune reçoit son propre type.

```ts
const pt0 = {};
const pt1 = { ...pt0, x: 3 };
const pt: Point = { ...pt1, y: 4 };
```

### Ajouter une propriété sous condition

```ts
declare let hasMiddle: boolean;
const firstLast = { first: 'Harry', last: 'Truman' };
const president = { ...firstLast, ...(hasMiddle ? { middle: 'S' } : {}) };
//    ^? { middle?: string; first: string; last: string }
```

TypeScript comprend qu'on décompose soit `{ middle: 'S' }`, soit `{}` : `middle` devient **optionnelle**. On peut ajouter plusieurs propriétés d'un coup :

```ts
const nameTitle = { name: 'Khufu', title: 'Pharaoh' };
const pharaoh = { ...nameTitle, ...(hasDates && { start: -2589, end: -2566 }) };
//    ^? { start?: number; end?: number; name: string; title: string }
```

(`...false` ne copie rien : c'est valable.) Note que le type ne dit plus que `start` et `end` vont **ensemble** ; le module 05 montre comment l'exprimer.

Ce qu'on ne peut **pas** exprimer avec un `if` et des mutations, on peut l'exprimer avec une expression : c'est le style que TypeScript sait le mieux suivre.

### Et pour une boucle ?

Pour remplir un dictionnaire dans une boucle, l'objet n'a pas de forme fixe : utilise un type à clés dynamiques (`Record<string, number>`, une `Map`) ou une construction fonctionnelle comme `Object.fromEntries` (module 04).

## Pièges fréquents

- **`{} as Point`** : l'assertion désactive la vérification ; un champ oublié n'est jamais signalé.
- **Muter un objet pour lui ajouter un champ** : crée un nouvel objet avec la décomposition.
- **`Object.assign(a, b)`** : son type est une intersection approximative et il mute `a` ; préfère `{ ...a, ...b }`.

## À retenir

- Le type d'un objet est fixé à sa création : construis-le d'un coup.
- `{ ...a, ...b }` compose des objets avec un type exact.
- `...(cond ? { k } : {})` ou `...(cond && { k })` ajoute des propriétés optionnelles sous condition.
