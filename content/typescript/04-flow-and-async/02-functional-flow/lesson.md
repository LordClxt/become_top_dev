---
id: ts-ch04-l02
title: "Des constructions fonctionnelles pour faire circuler les types"
source: { chapter: 3, pages: "123-127" }
duration_min: 25
concepts:
  - id: ts-functional-flow
    label: "map, filter, flat, Object.fromEntries… produisent un nouveau type à chaque étape : les types circulent sans annotation"
  - id: ts-imperative-annotations
    label: "Une boucle impérative qui remplit un objet vide oblige à annoter ou à asserter ; la version fonctionnelle s'en passe"
  - id: ts-groupby-library
    label: "Les fonctions de regroupement (Object.groupBy, Map.groupBy, ou Lodash) sont typées de bout en bout : préfère-les aux réimplémentations"
glossary:
  - term: "Object.fromEntries"
    definition: "Construit un objet à partir d'une liste de paires [clé, valeur] ; l'inverse d'Object.entries."
  - term: "Map.groupBy"
    definition: "Regroupe les éléments d'un itérable dans une Map selon une clé calculée (ES2024)."
visuals: []
labs: [ts-ch04-l02-lab-rosters]
extra: false
xp: 25
---

## Pourquoi c'est important

Le code impératif (une boucle qui remplit un objet vide) se heurte à un principe du module 03 : le type d'un objet est fixé à sa création. Le code **fonctionnel**, lui, crée une nouvelle valeur à chaque étape, et donc un **nouveau type** à chaque étape. Résultat : moins d'annotations, et des types justes de bout en bout.

## Le concept

### Analyser un CSV

La version impérative :

```ts
const csvData = '…';
const rawRows = csvData.split('\n');
const headers = rawRows[0].split(',');

const rows = rawRows.slice(1).map((rowStr) => {
  const row = {};
  rowStr.split(',').forEach((val, j) => {
    row[headers[j]] = val;
    // ~~~~~~~~~~~~ No index signature with a parameter of type 'string' was found on type '{}'
  });
  return row;
});
```

Il faut annoter `const row: { [column: string]: string } = {}`. La version fonctionnelle n'a besoin de rien :

```ts
const rows = rawRows.slice(1).map((rowStr) =>
  Object.fromEntries(rowStr.split(',').map((val, j) => [headers[j], val])),
);
// { [k: string]: string }[]
```

(Le livre utilise aussi `_.zipObject` de Lodash, qui fait la même chose avec un type tout aussi précis.)

### Aplatir et combiner

```ts
interface BasketballPlayer { name: string; team: string; salary: number }
declare const rosters: { [team: string]: BasketballPlayer[] };

// impératif : il faut annoter allPlayers, sinon c'est un tableau évolutif qui part de any[]
let allPlayers: BasketballPlayer[] = [];
for (const players of Object.values(rosters)) {
  allPlayers = allPlayers.concat(players);
}

// fonctionnel : une expression, un type déduit
const allPlayers2 = Object.values(rosters).flat();   // BasketballPlayer[]
```

### Regrouper, trier

Pour trouver le mieux payé de chaque équipe, la version impérative demande une table intermédiaire, des tests `undefined`, des annotations. Avec les fonctions de la bibliothèque standard :

```ts
const byTeam = Map.groupBy(allPlayers2, (p) => p.team);     // Map<string, BasketballPlayer[]>
const best = [...byTeam.values()].map(
  (players) => players.toSorted((a, b) => b.salary - a.salary)[0],
);
```

`Object.groupBy` et `Map.groupBy` sont arrivés en ES2024 (après le livre, qui utilise `_.groupBy` de Lodash : même idée, `extra` pour la version native). `toSorted` (ES2023) trie **sans muter**.

Chaque étape produit un type qui découle de la précédente. Si `BasketballPlayer` gagne un champ, rien n'est à réécrire.

## Pièges fréquents

- **Remplir un `{}` dans une boucle** : annotations ou assertions obligatoires. Pense `Object.fromEntries`.
- **Réimplémenter `groupBy` à la main** : plus de code, plus de types à écrire, plus de bugs.
- **`sort()` sur un tableau partagé** : il est modifié en place ; préfère `toSorted()`.

## À retenir

- Les constructions fonctionnelles créent un nouveau type à chaque étape : les types circulent seuls.
- `Object.fromEntries`, `flat`, `Map.groupBy`, `toSorted` remplacent beaucoup de boucles annotées.
- Préfère une bibliothèque bien typée à une réimplémentation.
