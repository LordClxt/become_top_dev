---
id: ts-ch02-l05
title: "Alternatives aux signatures d'index, et pas d'index numérique"
source: { chapter: 2, pages: "81-88" }
duration_min: 25
concepts:
  - id: ts-index-signature-imprecise
    label: "Une signature d'index ({[k: string]: T}) est imprécise : elle accepte n'importe quelle clé et fait disparaître l'autocomplétion"
  - id: ts-index-alternatives
    label: "Préférer une interface, un Record<'a' | 'b', T>, un type mappé ou une Map quand les clés sont connues ou que l'ordre/les clés dynamiques comptent"
  - id: ts-numeric-index-strings
    label: "Les clés d'objet JavaScript sont des chaînes : un tableau n'est pas indexé par des number au sens strict (Object.keys renvoie des chaînes)"
  - id: ts-arraylike-iterable
    label: "Pour accepter une suite d'éléments, préférer Iterable<T> ou ArrayLike<T> à un type indexé par number"
glossary:
  - term: "signature d'index"
    definition: "Écriture { [key: string]: T } : un objet dont toutes les clés (chaînes) ont une valeur de type T."
  - term: "Record<K, V>"
    definition: "Type utilitaire : un objet dont les clés sont exactement K et les valeurs de type V."
visuals: []
labs: [ts-ch02-l05-lab-index-signatures]
extra: false
xp: 25
---

## Pourquoi c'est important

Quand on veut typer « un objet dont on ne connaît pas les clés », on écrit presque toujours :

```ts
type Rocket = { [property: string]: string };
const rocket: Rocket = { name: 'Falcon 9', variant: 'v1.0', thrust: '4,940 kN' };
```

C'est accepté, et très imprécis. Voyons ce que cela coûte, puis ce qu'on peut faire à la place.

## Le concept

### Ce que cache une signature d'index

- **Toute clé est valide** : `rocket.nmae = 'x'` (faute de frappe) ne génère aucune erreur.
- **Aucune clé n'est obligatoire** : `{}` est un `Rocket` valide.
- **Les valeurs sont toutes du même type**, même si `thrust` devrait être un nombre.
- **Pas d'autocomplétion** : `rocket.` ne propose rien.
- **Tout accès renvoie `string`** (jamais `undefined`), même pour une clé absente.

Si tu connais les clés, une **interface** est bien plus précise :

```ts
interface Rocket { name: string; variant: string; thrust_kN: number }
```

### Les données dynamiques

La signature d'index est légitime quand les clés sont **vraiment** inconnues : par exemple, une ligne de CSV dont les en-têtes viennent du fichier. Même là, garde deux idées : d'abord, que l'accès peut renvoyer `undefined` (on y revient au module 07 avec `noUncheckedIndexedAccess`). Ensuite, qu'une **`Map`** est souvent meilleure :

```ts
function parseCSV(input: string): Map<string, string>[] { /* … */ }
```

Une `Map` ne souffre pas des pièges de prototype (`'constructor'`, `'toString'`) et rend `.get(k)` explicitement `string | undefined`.

### Les clés connues mais nombreuses

Si le nombre de clés est fini, `Record` avec une union de littéraux est exact :

```ts
type Vec3D = Record<'x' | 'y' | 'z', number>;     // exactement x, y, z
type ABC = { [k in 'a' | 'b' | 'c']: k extends 'b' ? string : number };   // type mappé avec calcul
```

Contrairement à la signature d'index, `Record<'x'|'y'|'z', number>` exige les trois clés, refuse les autres, et propose l'autocomplétion.

Et quand certains champs sont connus **et** que d'autres sont libres :

```ts
interface Row { id: number; [column: string]: unknown }   // id est obligatoire, le reste libre
```

### Pas d'index numérique

```ts
const xs = [1, 2, 3];
const x0 = xs[0];          // number
const keys = Object.keys(xs);   // string[] : ['0', '1', '2']
```

En JavaScript, les clés d'un objet — y compris d'un tableau — sont des **chaînes** (`xs[0]` convertit 0 en `'0'`). TypeScript déclare bien `Array<T>` avec un index numérique, par commodité, mais ce modèle est trompeur : `for (const k in xs)` donne des chaînes. Pour **recevoir** une suite d'éléments, ne demande pas un type indexé par nombre : demande ce dont tu as besoin.

```ts
function checkedAccess<T>(xs: ArrayLike<T>, i: number): T { return xs[i]; }   // longueur + indices
function sum(xs: Iterable<number>): number { let t = 0; for (const x of xs) t += x; return t; }
```

`Iterable<T>` accepte tableaux, `Set`, générateurs, chaînes ; `ArrayLike<T>` ce qui a `length` et des indices. Le tuple `[number, number]` reste le bon type pour une paire fixe.

## Pièges fréquents

- **Signature d'index par défaut** pour un objet dont les clés sont en fait connues.
- **`Object.keys(obj)` en croyant récupérer des clés typées** : toujours `string[]`.
- **Indexer par `number` pour parcourir un objet** : les clés sont des chaînes.
- **Dictionnaires dans un objet avec des clés issues de l'utilisateur** : `'__proto__'` et `'constructor'` posent problème, préfère `Map`.

## À retenir

- Une signature d'index est imprécise (toute clé, aucune obligatoire, valeurs homogènes, pas d'autocomplétion).
- Clés connues : interface. Clés énumérables : `Record` avec une union de littéraux. Clés dynamiques : `Map`.
- Les clés d'objet sont des chaînes, même pour les tableaux.
- Pour recevoir une suite, demande `Iterable<T>` ou `ArrayLike<T>`.
