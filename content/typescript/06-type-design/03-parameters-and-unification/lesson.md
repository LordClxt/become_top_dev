---
id: ts-ch06-l03
title: "Paramètres répétés et types à unifier"
source: { chapter: 4, pages: "168-172" }
duration_min: 25
concepts:
  - id: ts-repeated-params
    label: "Plusieurs paramètres consécutifs du même type (drawRect(25, 50, 75, 100, 1)) s'inversent sans erreur ; on les regroupe en types nommés ou en objet"
  - id: ts-params-object
    label: "Un objet de paramètres nommés ({ topLeft, size, opacity }) rend chaque appel lisible et vérifiable ; exceptions : arguments commutatifs ou à ordre naturel"
  - id: ts-unify-types
    label: "Plutôt que modéliser deux variantes d'un même type (snake_case en base, camelCase dans le code) et les convertir, unifier sur une seule forme quand c'est possible"
glossary:
  - term: "paramètre nommé"
    definition: "En TypeScript, un paramètre objet décomposé ({ a, b }) : l'appel nomme chaque valeur, l'ordre n'a plus d'importance."
visuals: []
labs: [ts-ch06-l03-lab-shapes]
extra: false
xp: 25
---

## Pourquoi c'est important

Le système de types protège contre les mauvais **types** d'arguments, pas contre le mauvais **ordre** d'arguments du même type. Et à l'inverse, le système de types peut te tenter de modéliser des variantes inutiles. Deux règles de conception, une même idée : réduire les occasions de se tromper.

## Le concept

### Les paramètres répétés

```ts
drawRect(25, 50, 75, 100, 1);
```

Qu'est-ce que c'est ? `x, y, largeur, hauteur, opacité` ? `x1, y1, x2, y2` ? Impossible à dire sans la signature, et `drawRect(50, 25, 100, 75, 1)` compile tout aussi bien. Regroupe les paramètres en types qui ont un sens :

```ts
interface Point { x: number; y: number }
interface Dimension { width: number; height: number }
function drawRect(topLeft: Point, size: Dimension, opacity: number) { /* … */ }

drawRect({ x: 25, y: 50 }, { width: 75, height: 100 }, 1.0);
```

Ou un seul objet de paramètres nommés :

```ts
function drawRect(params: { topLeft: Point; size: Dimension; opacity: number }) { /* … */ }
drawRect({ topLeft: { x: 25, y: 50 }, size: { width: 75, height: 100 }, opacity: 1.0 });
```

Le lint `max-params` de typescript-eslint aide à repérer les signatures à rallonge. Deux exceptions : les arguments **commutatifs** (`max(a, b)`, `overlaps(a, b)`) et ceux dont l'ordre est **naturel** (`array.slice(start, end)`, `range(from, to)`).

### Unifier plutôt que modéliser les différences

Une base de données stocke des étudiants en `snake_case`, le code TypeScript préfère le `camelCase` :

```ts
interface StudentTable { first_name: string; last_name: string; birth_date: string }
interface Student { firstName: string; lastName: string; birthDate: string }
```

TypeScript sait dériver l'un de l'autre (types mappés et littéraux de gabarit, module 08), puis tu écris `objectToCamel` et `objectToSnake`. Mais chaque frontière devient un endroit où oublier une conversion : le système de types t'aide, il ne supprime pas l'erreur. Souvent, la solution la plus simple est de **ne pas** avoir deux types : garder `snake_case` partout dans le code qui manipule ces lignes. Une seule forme, aucune conversion à oublier.

Unifier peut demander d'adapter le code d'exécution (lire les colonnes en `snake_case`). Ce n'est pas toujours possible : si les types ne sont pas sous ton contrôle (une API publique, une forme imposée), il faut bien modéliser les variantes. Et n'unifie jamais deux types qui ne représentent **pas** la même chose : la ressemblance de forme ne suffit pas.

## Pièges fréquents

- **Cinq `number` à la suite** : l'ordre est une source d'erreur que le vérificateur ne voit pas.
- **Convertir dans un sens et oublier l'autre** : chaque variante d'un type multiplie les conversions.
- **Imposer un objet pour deux arguments commutatifs** : inutile.

## À retenir

- Évite plusieurs paramètres consécutifs du même type : types nommés ou objet de paramètres.
- Exceptions : arguments commutatifs ou à l'ordre naturel.
- Avant de modéliser deux variantes d'un type, demande-toi si tu peux n'en garder qu'une.
