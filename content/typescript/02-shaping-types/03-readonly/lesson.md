---
id: ts-ch02-l03
title: "readonly pour éviter les erreurs de mutation"
source: { chapter: 2, pages: "66-71" }
duration_min: 25
concepts:
  - id: ts-readonly-array-param
    label: "Un paramètre readonly T[] interdit à la fonction de modifier son argument et fait remonter les mutations accidentelles"
  - id: ts-readonly-subtype
    label: "T[] est un sous-type de readonly T[] : on peut passer un tableau modifiable là où l'on attend un tableau en lecture seule, pas l'inverse"
  - id: ts-readonly-shallow
    label: "Readonly<T> est superficiel : il protège les propriétés directes mais pas les objets imbriqués"
  - id: ts-readonly-vs-const
    label: "const empêche la réaffectation de la variable ; readonly empêche la modification du contenu"
glossary:
  - term: "readonly"
    definition: "Modificateur de type qui interdit d'écrire dans une propriété ou un tableau, vérifié à la compilation seulement (aucun effet à l'exécution)."
  - term: "Readonly<T>"
    definition: "Type utilitaire qui rend toutes les propriétés de T en lecture seule (un seul niveau)."
visuals: []
labs: [ts-ch02-l03-lab-readonly]
extra: false
xp: 25
---

## Pourquoi c'est important

Une fonction qui modifie son argument sans le dire provoque des bugs à distance. Voici un exemple qui n'a l'air de rien :

```ts
function arraySum(arr: number[]) {
  let sum = 0, num;
  while ((num = arr.pop()) !== undefined) {
    sum += num;           // arr.pop() VIDE le tableau de l'appelant
  }
  return sum;
}

function printTriangles(n: number) {
  const nums = [];
  for (let i = 0; i < n; i++) {
    nums.push(i);
    console.log(arraySum(nums));   // attend 0 1 3 6 10…, obtient 0 1 2 3 4
  }
}
```

`arraySum` consomme le tableau : à la deuxième itération, `nums` est vide puis ne contient que le dernier élément. Le bug n'est ni dans `arraySum` pris seul (il calcule bien la somme), ni dans `printTriangles` : c'est l'**effet de bord caché** qui est le problème. `readonly` le rend visible.

## Le concept

### `readonly` sur un paramètre

```ts
function arraySum(arr: readonly number[]) {
  let sum = 0;
  for (const num of arr) sum += num;
  return sum;
}
```

Si tu laisses `arr.pop()`, le compilateur s'oppose : `Property 'pop' does not exist on type 'readonly number[]'`. Le type `readonly number[]` n'a que les méthodes qui ne modifient pas (`map`, `slice`, `length`…). Conséquences importantes :

- tu **ne peux pas modifier** l'argument ;
- tu **peux** passer un `number[]` ordinaire : `number[]` est un **sous-type** de `readonly number[]` (la lecture seule retire des droits, elle n'en ajoute pas) ;
- l'inverse est refusé : un `readonly number[]` n'est pas assignable à `number[]`, car on pourrait alors le modifier.

Par ailleurs, `readonly` est **contagieux** : si `arraySum` accepte `readonly`, toute fonction qu'elle appelle sur le tableau doit aussi l'accepter. C'est un coût, et c'est le but : l'intention de non-mutation se propage et se vérifie. Si une fonction ne modifie jamais ses paramètres, **déclare-les `readonly`** : l'API devient plus honnête, et plus de tableaux sont acceptés.

### `Readonly<T>` : un seul niveau

Pour les objets, `Readonly<T>` (ou `readonly` devant chaque propriété) interdit la réaffectation des propriétés :

```ts
interface Outer { inner: { x: number } }
const o: Readonly<Outer> = { inner: { x: 0 } };
o.inner = { x: 1 };    // erreur : propriété en lecture seule
o.inner.x = 1;         // OK ! x n'est pas readonly
```

`Readonly<T>` est **superficiel** (*shallow*). Il ne retire pas non plus les méthodes qui modifient : un `Readonly<Date>` a toujours `setFullYear`. Le module 04 reviendra sur les types profondément immuables.

### `const` n'est pas `readonly`

`const nums = [1, 2]` interdit `nums = []` (réaffectation), mais pas `nums.push(3)`. Pour interdire la modification du **contenu**, il faut le type : `const nums: readonly number[] = [1, 2]`.

### Aucun effet à l'exécution

Comme tous les types, `readonly` est effacé. Si tu veux une protection à l'exécution, `Object.freeze` (superficiel lui aussi). Il vaut mieux compter sur le type pour trouver les erreurs en amont.

## Pièges fréquents

- **Oublier `readonly` sur les paramètres tableau** : la fonction mutante reste possible, et un tableau `readonly` ne peut plus lui être passé.
- **Croire `Readonly<T>` profond** : seul le premier niveau est protégé.
- **Confondre `const` et `readonly`**.
- **Casser un `readonly` avec une assertion** (`as number[]`) : on retrouve le bug de départ.

## À retenir

- Déclare `readonly` les paramètres tableau ou objet que ta fonction ne modifie pas.
- `T[]` est assignable à `readonly T[]`, pas l'inverse.
- `Readonly<T>` est superficiel et n'enlève pas les méthodes qui modifient.
- `const` protège la variable ; `readonly` protège le contenu.
