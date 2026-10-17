---
id: ts-ch06-l04
title: "Un type imprécis plutôt qu'un type inexact"
source: { chapter: 4, pages: "172-177" }
duration_min: 30
concepts:
  - id: ts-inaccurate-types
    label: "Un type précis mais inexact (GeoPosition en [number, number] alors que l'élévation existe) rejette des programmes valides : c'est pire qu'un type imprécis"
  - id: ts-precision-tradeoff
    label: "On augmente la précision par étapes (any → union → tuple taguée → récursif) en vérifiant à chaque étape qu'aucune expression valide n'est rejetée"
  - id: ts-type-test-suite
    label: "Une liste d'exemples valides et invalides (avec @ts-expect-error) sert de tests de non-régression pour un type complexe"
  - id: ts-uncanny-valley
    label: "Des types très précis mais aux messages d'erreur obscurs peuvent dégrader l'expérience : la précision a un coût de maintenance et de lisibilité"
glossary:
  - term: "type complet"
    definition: "Type qui accepte tous les programmes valides (aucun faux positif). Il peut être imprécis : il laisse aussi passer des programmes invalides."
  - term: "vallée de l'étrange (uncanny valley)"
    definition: "Zone où un type est presque exact : ses rares erreurs sont si surprenantes qu'il gêne plus qu'un type simple."
visuals: []
labs: [ts-ch06-l04-lab-expressions]
extra: false
xp: 30
---

## Pourquoi c'est important

Plus un type est précis, plus il attrape d'erreurs. Mais il y a une limite : un type qui **refuse des valeurs valides** (inexact) fait perdre confiance. Les développeurs ajoutent alors des `as any`… et perdent toute la sécurité. Entre un type imprécis et un type faux, choisis l'imprécis.

## Le concept

### Précis mais faux

Le livre raconte une erreur faite dans les types de GeoJSON :

```ts
interface Point { type: 'Point'; coordinates: number[] }
// « amélioré » en :
type GeoPosition = [number, number];
interface Point { type: 'Point'; coordinates: GeoPosition }
```

Plus précis ? Oui. Exact ? Non : une position peut avoir une **élévation**, un troisième nombre, voire plus. Tous les utilisateurs qui en avaient une ont dû contourner le type. Le changement a été retiré.

### Monter en précision prudemment

Les styles de cartes Mapbox utilisent des expressions en tableaux, à la Lisp : `["+", 1, 2]`, `["case", [">", 20, 10], "red", "blue"]`. Comment les typer ? On commence large, puis on resserre **en gardant des tests** :

```ts
type Expression1 = any;
type Expression2 = number | string | any[];

type FnName = '+' | '-' | '*' | '/' | '>' | '<' | 'case' | 'rgb';
type CallExpression = [FnName, ...any[]];
type Expression3 = number | string | CallExpression;
```

`Expression3` refuse déjà `true` et `["**", 2, 31]`. Pour vérifier le **nombre** d'arguments, il faut un type récursif :

```ts
type Expression4 = number | string | CallExpression;
type CallExpression = MathCall | CaseCall | RGBCall;
type MathCall = ['+' | '-' | '/' | '*' | '>' | '<', Expression4, Expression4];
interface CaseCall {
  0: 'case';
  [n: number]: Expression4;
  length: 4 | 6 | 8 | 10 | 12 | 14 | 16;
}
type RGBCall = ['rgb', Expression4, Expression4, Expression4];
```

`CaseCall` est une interface (pour que la récursion soit acceptée) avec un `length` pair : `case`, des paires (condition, valeur), puis la valeur par défaut.

### Les tests de types

Chaque étape se vérifie avec deux listes :

```ts
const okExpressions: Expression4[] = [
  10, 'red', ['+', 10, 5], ['rgb', 255, 128, 64], ['case', ['>', 20, 10], 'red', 'blue'],
];
// chaque ligne doit être une erreur :
// @ts-expect-error
const e1: Expression4 = true;
// @ts-expect-error
const e2: Expression4 = ['**', 2, 31];
```

Si une version plus précise rejette un exemple valide, c'est une **régression** : le type est devenu inexact. (Le module 09 approfondit les tests de types.)

### La vallée de l'étrange

`Expression4` est plus précis, mais regarde ses messages : `["-", 12]` donne une erreur sur la propriété `length`… de `CaseCall`. Un utilisateur ne comprendra pas. Et Mapbox accepte en réalité `["-", 12]` (moins unaire) et `["+", 1, 2, 3]` : notre type est **inexact** sur ces cas. Plus un type est précis, plus il est coûteux à maintenir et plus ses erreurs sont obscures. Va aussi loin que l'exactitude le permet, pas plus : là où tu ne sais pas modéliser exactement, **reconnais le trou** avec `any` ou `unknown` plutôt que de le combler par un type faux. Et surveille les messages d'erreur et l'autocomplétion à chaque étape : l'expérience du développeur compte autant que la correction.

## Pièges fréquents

- **Resserrer un type sans tests** : tu ne vois pas les valeurs valides que tu rejettes désormais.
- **Un tuple de longueur fixe pour des données de longueur variable** (`[number, number]` pour des coordonnées).
- **Viser une précision parfaite** : messages d'erreur incompréhensibles, maintenance lourde.

## À retenir

- Un type inexact (qui rejette des valeurs valides) est pire qu'un type imprécis.
- Monte en précision par étapes, avec une suite d'exemples valides et invalides.
- Pèse la précision contre la lisibilité des erreurs et le coût de maintenance.
