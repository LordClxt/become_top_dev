---
id: ts-ch07-l03
title: "unknown plutôt que any pour les valeurs de type inconnu"
source: { chapter: 5, pages: "195-198" }
duration_min: 25
concepts:
  - id: ts-unknown-vs-any
    label: "any est assignable à tout et tout lui est assignable (il sort du système de types) ; unknown accepte tout mais n'est assignable à rien sans rétrécissement"
  - id: ts-unknown-narrowing
    label: "On rétrécit un unknown avec typeof, instanceof, in, ou un type guard (isBook) avant de l'utiliser"
  - id: ts-generic-return-only
    label: "Un paramètre de type qui n'apparaît que dans le retour (parseYAML<T>) est une assertion déguisée : préférer unknown"
  - id: ts-object-types
    label: "{} accepte tout sauf null et undefined, object tout type non primitif, unknown absolument tout"
glossary:
  - term: "unknown"
    definition: "Le type « supérieur » : toute valeur lui est assignable, mais on ne peut rien en faire avant de l'avoir rétréci."
  - term: "never"
    definition: "Le type « inférieur » : l'ensemble vide, assignable à tout, auquel rien n'est assignable."
visuals: []
labs: [ts-ch07-l03-lab-unknown]
extra: false
xp: 25
---

## Pourquoi c'est important

Une fonction qui lit du YAML, du JSON ou une saisie utilisateur ne connaît pas le type de ce qu'elle renvoie. La tentation est `any`. Mais `any` laisse l'appelant faire n'importe quoi, en silence. `unknown` dit la même chose (« je ne sais pas ») tout en **obligeant** l'appelant à vérifier.

## Le concept

### any ment, unknown avoue

```ts
function parseYAML(yaml: string): any { /* … */ }

interface Book { name: string; author: string }
const book = parseYAML(`name: Wuthering Heights\nauthor: Emily Brontë`);
console.log(book.title);   // aucune erreur, affiche undefined
book('read');              // aucune erreur, plante à l'exécution
```

Avec `unknown` :

```ts
function safeParseYAML(yaml: string): unknown { return parseYAML(yaml); }

const book = safeParseYAML(`…`);
book.title;
// ~~~~ 'book' is of type 'unknown'
book('read');
// ~~~~ 'book' is of type 'unknown'
const book2 = safeParseYAML(`…`) as Book;   // l'appelant doit choisir explicitement
```

Pourquoi ? `any` a deux propriétés : tout type lui est assignable, **et** il est assignable à tout type. Aucun ensemble ne peut être à la fois sous-ensemble et sur-ensemble de tous les autres : `any` sort du système de types. `unknown` n'a que la première propriété : c'est l'ensemble de toutes les valeurs (le type « supérieur »), et `never` est l'ensemble vide (le type « inférieur »).

### Rétrécir un unknown

```ts
function isBook(value: unknown): value is Book {
  return (
    typeof value === 'object' && value !== null &&
    'name' in value && typeof value.name === 'string' &&
    'author' in value && typeof value.author === 'string'
  );
}

const value = safeParseYAML(yaml);
if (isBook(value)) {
  console.log(value.name);   // Book
}
```

`instanceof`, `typeof`, `in` et les type guards fonctionnent tous sur `unknown`.

### Un générique de retour n'est pas mieux

```ts
function safeParseYAML<T>(yaml: string): T { return parseYAML(yaml); }
const book = safeParseYAML<Book>(yaml);
```

Ça ressemble à du typage, mais c'est une **assertion déguisée** : rien ne vérifie que le résultat est un `Book`. Un paramètre de type qui n'apparaît que dans le type de retour est un signal d'alarme (module 08). Préfère renvoyer `unknown` et laisser l'appelant asserter ou valider, explicitement.

### unknown, {} et object

- `unknown` : absolument tout ;
- `{}` : tout sauf `null` et `undefined` (y compris `'abc'` et `12`) ;
- `object` : tout ce qui n'est pas primitif (objets, tableaux, fonctions).

Avant `unknown` (TS 3.0), on utilisait `{}` ; aujourd'hui, `unknown` est presque toujours le bon choix.

Enfin, pour convertir un type en un autre sans lien, la double assertion `x as unknown as T` est plus honnête que `x as any as T` : elle passe par un type qui n'a rien de magique.

## Pièges fréquents

- **Renvoyer `any`** depuis un parseur : les erreurs passent en silence chez tous les appelants.
- **`parse<T>(): T`** : un générique de retour seul ne vérifie rien.
- **Confondre `{}` et `object`** : `{}` accepte les chaînes et les nombres.

## À retenir

- `unknown` pour une valeur de type inconnu : on doit la rétrécir avant de l'utiliser.
- Un type guard (`value is Book`) valide et rétrécit en même temps.
- Pas de paramètre de type qui n'apparaît que dans le retour.
