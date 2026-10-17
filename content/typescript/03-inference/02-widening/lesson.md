---
id: ts-ch03-l02
title: "Comment une variable obtient son type : l'élargissement"
source: { chapter: 3, pages: "96-104" }
duration_min: 30
concepts:
  - id: ts-one-variable-one-type
    label: "Une variable garde un seul type : réutiliser la même variable pour un autre type est refusé ; on crée une nouvelle variable (const de préférence)"
  - id: ts-widening-let-const
    label: "let x = 'x' est élargi à string ; const x = 'x' garde le type littéral \"x\""
  - id: ts-object-props-widen
    label: "Les propriétés d'un objet sont inférées comme des let : { x: 1 } devient { x: number }"
  - id: ts-as-const
    label: "as const désactive l'élargissement en profondeur : littéraux, propriétés readonly, tuples en lecture seule"
  - id: ts-satisfies
    label: "satisfies vérifie qu'une valeur respecte un type sans élargir le type inféré (on garde les clés précises)"
glossary:
  - term: "élargissement (widening)"
    definition: "Choix par TypeScript d'un type plus large que la valeur (string au lieu de \"x\") quand la variable peut changer."
  - term: "as const"
    definition: "Assertion de constance : demande le type le plus étroit possible pour un littéral, en lecture seule."
  - term: "satisfies"
    definition: "Opérateur (TS 4.9) qui vérifie la conformité d'une expression à un type tout en conservant son type inféré."
visuals: []
labs: [ts-ch03-l02-lab-widening]
extra: false
xp: 30
---

## Pourquoi c'est important

Une constante comme `'x'` appartient à beaucoup d'ensembles : `"x"`, `'x' | 'y'`, `string`, `unknown`… Quand tu écris `let axis = 'x'`, TypeScript doit **choisir** un type. Ce choix s'appelle l'élargissement (*widening*). Le comprendre explique la moitié des erreurs « Type 'string' is not assignable to type '"x" | "y"' ».

## Le concept

### Une variable, un type

La valeur d'une variable peut changer, son type non :

```ts
let productId = '12-34-56';
fetchProduct(productId);
productId = 123456;
// ~~~~~~~ Type 'number' is not assignable to type 'string'
```

On pourrait annoter `string | number`, mais chaque utilisation devrait ensuite tester le type. Mieux vaut **deux variables** aux noms parlants (`id` et `serial`), et de préférence des `const`.

### let élargit, const non

```ts
let x = 'x';      // string : x peut recevoir une autre chaîne plus tard
const y = 'y';    // "y"   : y ne peut pas changer
```

Le piège classique :

```ts
interface Vector3 { x: number; y: number; z: number }
function getComponent(vector: Vector3, axis: 'x' | 'y' | 'z') { return vector[axis]; }

let axis = 'x';
getComponent({ x: 1, y: 2, z: 3 }, axis);
//                                 ~~~~ Argument of type 'string' is not assignable…
```

Avec `const axis = 'x'`, ça passe.

### Les objets se comportent comme des let

```ts
const v = { x: 1 };     // { x: number }
v.x = 3;                // OK
v.x = '3';              // erreur
v.y = 4;                // erreur : on ne peut pas ajouter de propriété
```

Chaque propriété est élargie comme un `let`. Même règle pour les tableaux : `[1, 2, 3]` est `number[]`, pas un tuple.

### Les quatre leviers contre l'élargissement

1. **Une annotation** : `const v: { x: 1 | 3 | 5 } = { x: 1 }`.
2. **Le contexte** : passer la valeur directement en argument (leçon 5).
3. **`as const`** : le type le plus étroit, en profondeur et en lecture seule.

```ts
const v2 = { x: 1, y: 2 } as const;   // { readonly x: 1; readonly y: 2 }
const a3 = [1, 2, 3] as const;        // readonly [1, 2, 3]
const METHODS = ['GET', 'POST'] as const;
type Method = (typeof METHODS)[number]; // "GET" | "POST"
```

4. **`satisfies`** : vérifier sans élargir.

```ts
type Point = [lat: number, lng: number];
const capitals1: Record<string, Point> = { ny: [-73.7562, 42.6526], ca: [-121.4944, 38.5816] };
capitals1.wa;   // OK pour TypeScript… mais undefined à l'exécution

const capitals2 = {
  ny: [-73.7562, 42.6526],
  ca: [-121.4944, 38.5816],
} satisfies Record<string, Point>;
capitals2.wa;   // erreur : la propriété n'existe pas
// type de capitals2 : { ny: [number, number]; ca: [number, number] }
```

L'annotation remplace le type inféré par `Record<string, Point>` et oublie quelles clés existent. `satisfies` vérifie que chaque valeur est un `Point` **et** garde les clés précises.

Pour les tuples, un petit helper fait le travail : `function tuple<T extends unknown[]>(...elements: T) { return elements; }` ; `tuple(1, 'a')` a le type `[number, string]`.

`Object.freeze` (immuabilité **superficielle** à l'exécution) produit aussi un type `readonly`, mais d'un seul niveau.

## Pièges fréquents

- **Réutiliser une variable pour un autre type** : crée une nouvelle variable.
- **`let` pour une valeur qui ne change pas** : elle sera élargie ; utilise `const`.
- **Annoter `Record<string, T>` une table connue** : tu perds les clés ; préfère `satisfies`.
- **Croire que `as const` agit à l'exécution** : c'est purement un type, rien n'est gelé.

## À retenir

- `let` élargit (`string`), `const` garde le littéral (`"x"`), les propriétés d'objet sont élargies.
- `as const` donne le type le plus étroit, en profondeur et en lecture seule.
- `satisfies` vérifie la conformité tout en gardant le type précis.
