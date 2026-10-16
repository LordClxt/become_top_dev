---
id: ts-ch02-l01
title: "Typer des expressions de fonction entières"
source: { chapter: 2, pages: "56-59" }
duration_min: 20
concepts:
  - id: ts-function-type-alias
    label: "On peut nommer la signature d'une fonction (type BinaryFn) et l'appliquer à une expression de fonction entière"
  - id: ts-typeof-function
    label: "const f: typeof g = … réutilise la signature d'une fonction existante (fetch) et vérifie aussi le type de retour"
  - id: ts-parameters-returntype
    label: "Parameters<typeof f> et ReturnType<typeof f> extraient les types de paramètres et de retour d'une fonction"
glossary:
  - term: "expression de fonction"
    definition: "Une fonction affectée à une variable (const f = (a, b) => …), par opposition à une déclaration `function f() {}`."
visuals: []
labs: [ts-ch02-l01-lab-function-types]
extra: false
xp: 20
---

## Pourquoi c'est important

JavaScript donne deux façons d'écrire une fonction : la **déclaration** (`function add(a, b) {…}`) et l'**expression** (`const add = (a, b) => …`). TypeScript sait annoter les paramètres de chacune, mais l'expression a un avantage : on peut appliquer **un type à toute la fonction** d'un coup. C'est moins de répétition et plus de vérification.

## Le concept

### Nommer une signature

Une suite de fonctions qui ont la même forme :

```ts
function add(a: number, b: number) { return a + b; }
function sub(a: number, b: number) { return a - b; }
function mul(a: number, b: number) { return a * b; }
```

devient, avec un type de fonction :

```ts
type BinaryFn = (a: number, b: number) => number;

const add: BinaryFn = (a, b) => a + b;
const sub: BinaryFn = (a, b) => a - b;
const mul: BinaryFn = (a, b) => a * b;
```

Les paramètres sont **déduits** du contexte (le type attendu), tu ne les écris plus. Si la signature change, les implémentations sont revérifiées d'un coup. On peut aussi grouper : `const ops: Record<string, BinaryFn> = { add, sub, mul }`.

### `typeof fetch` : réutiliser la signature d'une fonction existante

Tu veux envelopper `fetch` pour lever une erreur sur un statut HTTP d'échec. L'écriture naïve :

```ts
async function checkedFetch(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  if (!response.ok) {
    return new Error('Request failed: ' + response.status);   // oups : « return » au lieu de « throw »
  }
  return response;
}
```

TypeScript n'y voit aucun problème : la fonction renvoie `Promise<Response | Error>`. L'erreur apparaît bien plus loin, chez l'appelant. Avec une annotation sur toute l'expression :

```ts
const checkedFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (!response.ok) {
    return new Error('Request failed: ' + response.status);
    // ~~~ Type 'Error' is not assignable to type 'Response'
  }
  return response;
};
```

Deux gains : tu n'as pas recopié les types des paramètres, et **le type de retour est imposé** (`Promise<Response>`). L'erreur se produit à l'endroit exact du bug.

### Extraire les types d'une fonction

Quand tu veux la signature sans la fonction, ou une partie :

```ts
function logAndFetch(...args: Parameters<typeof fetch>) {   // [input, init?]
  console.log('fetch', args[0]);
  return fetch(...args);
}
type Out = ReturnType<typeof fetch>;                         // Promise<Response>
```

`Parameters<typeof f>` donne un tuple des types de paramètres, `ReturnType<typeof f>` le type de retour.

## Pièges fréquents

- **Dupliquer les mêmes annotations sur dix fonctions** : nomme la signature.
- **Laisser le type de retour inféré sur une fonction qui devrait suivre un contrat** : `return` d'une erreur au lieu de `throw`, par exemple.
- **Confondre `typeof fetch` (le type de la fonction) et `typeof response` (l'opérateur JavaScript)** : la position fait la différence (module 01).

## À retenir

- Applique un type à l'expression de fonction entière plutôt qu'à ses paramètres un par un.
- `const f: typeof g = …` donne à `f` la signature de `g` et vérifie le retour.
- `Parameters<typeof f>` et `ReturnType<typeof f>` extraient des morceaux de signature.
