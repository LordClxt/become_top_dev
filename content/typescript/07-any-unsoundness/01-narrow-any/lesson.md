---
id: ts-ch07-l01
title: "Réduire la portée et préciser les any"
source: { chapter: 5, pages: "185-190" }
duration_min: 25
concepts:
  - id: ts-any-scope
    label: "any est contagieux : une variable any (ou une fonction qui renvoie any) propage l'absence de types ; on le limite à une expression (x as any) et on ne renvoie jamais any"
  - id: ts-expect-error-vs-ignore
    label: "@ts-expect-error vaut mieux que @ts-ignore : il signale l'erreur une fois corrigée"
  - id: ts-any-variants
    label: "Les variantes précises de any (any[], Record<string, any>, () => any, unknown[]) gardent une partie de la vérification"
glossary:
  - term: "any contagieux"
    definition: "Un any se propage : tout ce qui en dérive (propriétés, retours, variables) devient any à son tour."
visuals: []
labs: [ts-ch07-l01-lab-narrow-any]
extra: false
xp: 25
---

## Pourquoi c'est important

Parfois `any` est inévitable : une bibliothèque mal typée, une migration en cours. Mais un `any` mal placé se **propage** dans tout le code qui l'utilise. La règle : le plus petit `any` possible, le plus précis possible.

## Le concept

### Limiter la portée

```ts
declare function getPizza(): Pizza;
declare function eatSalad(salad: Salad): void;

function eatDinner1() {
  const pizza: any = getPizza();    // à éviter
  eatSalad(pizza);
  pizza.slice();                    // aucune vérification ici non plus
}

function eatDinner2() {
  const pizza = getPizza();
  eatSalad(pizza as any);           // préférable : any limité à un argument
  pizza.slice();                    // erreur détectée : Pizza n'a pas de slice
}
```

Pire, si `eatDinner1` **renvoie** `pizza`, son type de retour devient `any` et la contagion gagne tous les appelants. Ne renvoie jamais un `any` : annote le type de retour.

Pour faire taire une erreur précise, une directive vaut mieux qu'un `any` :

```ts
// @ts-expect-error
eatSalad(getPizza());
```

`@ts-expect-error` est préférable à `@ts-ignore` : le jour où l'erreur disparaît (bibliothèque corrigée), la directive inutile devient elle-même une erreur. Dans un objet, mets le `as any` sur la propriété fautive, pas sur l'objet entier :

```ts
const config: Config = { a: 1, b: 2, c: { key: value as any } };   // pas { … } as any
```

### Préciser le any

```ts
function getLengthBad(array: any) { return array.length; }        // renvoie any, accepte /123/
function getLength(array: any[]) { return array.length; }         // renvoie number, refuse /123/
```

Avec `any[]`, TypeScript vérifie encore que c'est un tableau, que `length` existe, et le retour est un `number`. Autres variantes :

- `Record<string, any>` (ou `{ [key: string]: any }`) pour un objet aux valeurs inconnues ;
- `object` pour un objet dont on énumère les clés sans lire les valeurs ;
- `() => any`, `(arg: any) => any`, `(...args: any[]) => any` pour une fonction quelconque (plus précis que `Function`) ;
- `unknown[]` quand on n'utilise pas les éléments (module suivant : `unknown`).

typescript-eslint (`no-explicit-any`, `no-unsafe-*`) aide à suivre les `any` restants.

## Pièges fréquents

- **`const x: any = …` en tête de fonction** : toute la fonction perd la vérification.
- **Renvoyer un `any`** : la contagion s'étend aux appelants.
- **`@ts-ignore`** : il reste en place même quand l'erreur a disparu.
- **`any` là où `any[]` ou `Record<string, any>` suffit**.

## À retenir

- Limite `any` à l'expression qui en a besoin ; ne renvoie jamais `any`.
- `@ts-expect-error` plutôt que `@ts-ignore`.
- Utilise la variante la plus précise : `any[]`, `Record<string, any>`, `() => any`, `unknown`.
