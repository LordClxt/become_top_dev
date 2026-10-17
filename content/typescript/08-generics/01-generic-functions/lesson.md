---
id: ts-ch08-l01
title: "Les génériques sont des fonctions entre types"
source: { chapter: 6, pages: "216-221" }
duration_min: 30
concepts:
  - id: ts-generic-as-function
    label: "Un type générique est une fonction entre types : MyPartial<T> prend un type et en renvoie un autre"
  - id: ts-generic-constraints
    label: "extends dans un paramètre de type est une contrainte (comme une annotation de paramètre) : K extends keyof T, T extends object"
  - id: ts-constraint-not-workaround
    label: "Corriger une erreur de type générique par une contrainte, pas par @ts-expect-error ou une intersection K & PropertyKey qui fait taire le vérificateur"
  - id: ts-generic-function-inference
    label: "Une fonction générique (pick(obj, ...keys)) fait inférer les paramètres de type depuis les arguments, contrairement à un type générique"
glossary:
  - term: "paramètre de type"
    definition: "Variable de type (T, K) d'un type ou d'une fonction générique, remplacée par un type concret à l'utilisation."
  - term: "contrainte"
    definition: "Borne supérieure d'un paramètre de type (`T extends object`) : T doit être assignable à ce type."
visuals: []
labs: [ts-ch08-l01-lab-my-utilities]
extra: false
xp: 30
---

## Pourquoi c'est important

Le système de types de TypeScript est un petit langage de programmation à part entière, qui s'exécute à la compilation. Ses **fonctions** sont les types génériques. Les penser ainsi rend leur écriture naturelle : des paramètres, des « annotations » sur ces paramètres (les contraintes), un corps.

## Le concept

### Une fonction entre types

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] };

interface Person { name: string; age: number }
type PartPerson = MyPartial<Person>;   // { name?: string; age?: number }
```

`MyPartial` prend un type et en renvoie un autre, comme une fonction prend une valeur et en renvoie une autre. Le parallèle va loin : les génériques ont des paramètres, des valeurs par défaut (`<T = string>`), et des **contraintes**, l'équivalent des annotations de type.

### Les contraintes

```ts
type MyPick<T, K> = {
  [P in K]: T[P]
  //  ~ Type 'K' is not assignable to type 'string | number | symbol'
  //    ~~~~ Type 'P' cannot be used to index type 'T'
};
```

Deux erreurs : `K` doit être un ensemble de clés, et ses clés doivent appartenir à `T`. On pourrait les faire taire :

- `// @ts-expect-error` : le type « marche »… et `MyPick<Person, 'age' | 'firstName'>` produit des `unknown`, sans erreur ;
- `[P in K & PropertyKey]: T[P & keyof T]` : les intersections font taire le vérificateur, presque comme un `any`.

La vraie correction est une **contrainte**, comme on annoterait un paramètre de fonction :

```ts
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };

type AgeOnly = MyPick<Person, 'age'>;          // { age: number }
type Bad = MyPick<Person, 'firstName'>;
//                        ~~~~~~~~~~~ '"firstName"' does not satisfy the constraint 'keyof Person'
```

L'erreur est maintenant **à l'appel**, là où est la faute.

### Nommer les paramètres

Comme pour les variables, la longueur d'un nom suit sa portée : `T`, `K` conviennent dans une ligne ; un type générique long mérite des noms explicites (`Key`, `Value`). Documente-les avec la balise TSDoc `@template`.

### Fonctions génériques et inférence

Un type générique doit recevoir ses arguments explicitement. Une **fonction** générique les infère :

```ts
function pick<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
  const picked: Partial<Pick<T, K>> = {};
  for (const k of keys) picked[k] = obj[k];
  return picked as Pick<T, K>;
}
const p = pick({ name: 'Ada', age: 36 }, 'age');   // { age: number }
```

Les classes génériques infèrent aussi à la construction (`new Box(42)` donne `Box<number>`). TypeScript n'a pas de types d'ordre supérieur (une fonction de type qui prendrait un *générique* en paramètre) : c'est une limite de ce « langage ».

## Pièges fréquents

- **Faire taire une erreur de type générique** avec `@ts-expect-error` ou des intersections : le type produit devient faux sans prévenir.
- **Oublier une contrainte** : l'erreur apparaît dans le corps du générique au lieu de l'appel.
- **Des noms à une lettre dans un générique de vingt lignes**.

## À retenir

- Un type générique est une fonction entre types.
- `extends` est l'annotation de type de ses paramètres : utilise-la pour corriger les erreurs.
- Les fonctions et classes génériques infèrent leurs paramètres de type depuis les arguments.
