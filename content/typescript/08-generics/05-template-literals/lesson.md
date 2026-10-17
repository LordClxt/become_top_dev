---
id: ts-ch08-l05
title: "Les types littéraux de gabarit"
source: { chapter: 6, pages: "234-240" }
duration_min: 35
concepts:
  - id: ts-template-literal-type
    label: "Un type littéral de gabarit (`pseudo${string}`, `data-${string}`) décrit un sous-ensemble de string selon sa forme"
  - id: ts-template-infer
    label: "Combinés à infer, ils découpent une chaîne au niveau des types (S extends `${infer Head}_${infer Tail}`), récursivement"
  - id: ts-key-remapping
    label: "Un type mappé avec as et un gabarit renomme les clés d'un objet (ObjectToCamel<T>)"
  - id: ts-dsl-precision-limits
    label: "Modéliser un DSL (sélecteurs CSS, routes) donne des types précis mais attention aux cas qui sortent du modèle : rester exact quitte à être moins précis"
glossary:
  - term: "type littéral de gabarit"
    definition: "Type écrit comme un gabarit de chaîne (`prefix-${string}`) qui décrit les chaînes de cette forme ; il peut combiner des unions et des types génériques."
  - term: "Capitalize<S>"
    definition: "Type intrinsèque qui met en majuscule la première lettre d'un littéral de chaîne (aussi : Uppercase, Lowercase, Uncapitalize)."
visuals: []
labs: [ts-ch08-l05-lab-template-literals]
extra: false
xp: 35
---

## Pourquoi c'est important

Beaucoup d'API JavaScript reposent sur des **chaînes structurées** : attributs `data-*`, sélecteurs CSS, routes `/users/:id`, conversions `snake_case` → `camelCase`. Les types littéraux de gabarit permettent de les décrire, et de **calculer** des types à partir d'elles.

## Le concept

### Des sous-ensembles de string

```ts
type MedievalWord = `${string}ieval`;
const terms: MedievalWord[] = ['medieval', 'primeval'];
// 'modern' serait refusé

type Attributes = {
  role?: string;
  [key: `data-${string}`]: unknown;   // n'importe quel attribut data-*
};
const el: Attributes = { 'data-id': 7, role: 'button' };
// { 'aria-label': 'x' } serait refusé
```

On peut combiner avec des unions : `` `${'margin' | 'padding'}-${'top' | 'bottom'}` `` donne les quatre combinaisons.

### Découper avec infer

```ts
type ToCamelOnce<S extends string> =
  S extends `${infer Head}_${infer Tail}` ? `${Head}${Capitalize<Tail>}` : S;
type T = ToCamelOnce<'foo_bar'>;   // "fooBar"

type ToCamel<S extends string> =
  S extends `${infer Head}_${infer Tail}` ? `${Head}${Capitalize<ToCamel<Tail>>}` : S;
type U = ToCamel<'foo_bar_baz'>;   // "fooBarBaz"
```

`infer` capture les morceaux avant et après le premier `_`, et la récursion traite la suite. Avec un type mappé et `as`, on renomme toutes les clés d'un objet :

```ts
type ObjectToCamel<T extends object> = { [K in keyof T as ToCamel<K & string>]: T[K] };
type Student = ObjectToCamel<{ first_name: string; last_name: string }>;
// { firstName: string; lastName: string }
```

(Le module 06 rappelait qu'**unifier** vaut souvent mieux que convertir ; mais quand une conversion est inévitable, ce type la rend sûre.)

### Un DSL, avec prudence

Le livre type `querySelector` pour qu'un sélecteur `'img#spectacular-sunset'` renvoie un `HTMLImageElement` :

```ts
type HTMLTag = keyof HTMLElementTagNameMap;
declare function querySelector<TagName extends HTMLTag>(
  selector: `${TagName}#${string}`
): HTMLElementTagNameMap[TagName] | null;
```

Mais `'div#container img'` correspond aussi au gabarit (`${string}` avale l'espace) et serait typé `HTMLDivElement` : **faux**. La correction ajoute une branche qui revient au type générique `Element` dès que le sélecteur contient un caractère spécial (espace, `>`, `:`…). Leçon du module 06 : préfère un type imprécis à un type inexact.

Autre usage classique : extraire les paramètres d'une route.

```ts
type RouteParams<P extends string> =
  P extends `${string}:${infer Param}/${infer Rest}` ? { [K in Param | keyof RouteParams<Rest>]: string } :
  P extends `${string}:${infer Param}` ? { [K in Param]: string } :
  {};
type R = RouteParams<'/users/:id/posts/:postId'>;   // { id: string; postId: string }
```

## Pièges fréquents

- **`${string}` qui avale trop** : il correspond aussi aux espaces et aux séparateurs.
- **Des types de chaînes trop ambitieux** : messages d'erreur obscurs, et cas réels refusés.
- **Oublier `& string`** quand on passe une clé (`keyof T`) à un type qui attend une chaîne.

## À retenir

- Les types littéraux de gabarit décrivent des chaînes par leur forme.
- Avec `infer` et la récursion, ils transforment des chaînes au niveau des types ; avec `as`, ils renomment des clés.
- Modélise un DSL tant que le type reste exact.
