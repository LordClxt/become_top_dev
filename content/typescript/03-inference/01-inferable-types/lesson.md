---
id: ts-ch03-l01
title: "Ne pas encombrer son code de types inférables"
source: { chapter: 3, pages: "90-96" }
duration_min: 25
concepts:
  - id: ts-no-inferable-annotations
    label: "Une annotation sur une variable locale dont le type est évident n'apporte que du bruit : TypeScript l'infère"
  - id: ts-annotate-signatures
    label: "On annote les paramètres des fonctions (les signatures), pas les variables locales ; la décomposition (destructuring) se passe d'annotations"
  - id: ts-annotate-object-literal
    label: "Annoter un littéral d'objet déclenche la vérification des propriétés en trop et place l'erreur à la définition"
  - id: ts-annotate-return
    label: "Annoter le type de retour quand la fonction a plusieurs return, fait partie d'une API publique ou renvoie un type nommé"
glossary:
  - term: "type inférable"
    definition: "Type que TypeScript déduit seul de la valeur (let x = 12 donne number) ; l'écrire en plus est redondant."
visuals: []
labs: [ts-ch03-l01-lab-annotations]
extra: false
xp: 25
---

## Pourquoi c'est important

Quand on découvre TypeScript, on a tendance à tout annoter : `let x: number = 12`. C'est inutile. TypeScript **infère** le type de la plupart des expressions, et une annotation redondante a un coût : elle encombre la lecture, et elle fige un type qu'il faudra modifier à la main le jour où la valeur change. Savoir **où** annoter est une compétence à part entière.

## Le concept

### Laisser l'inférence faire son travail

```ts
let x = 12;                     // number
const person = {
  name: 'Sojourner Truth',      // { name: string; born: { where: string; when: string } }
  born: { where: 'Swartekill, NY', when: 'c.1797' },
};
const axis1 = 'x';              // "x" (plus précis qu'une annotation : string)
```

Survole ces variables dans ton éditeur : le type affiché est exactement celui que tu aurais écrit, parfois **plus précis**. Même chose pour la décomposition :

```ts
function logProduct(product: Product) {
  const { id, name, price } = product;     // pas besoin d'annoter id, name, price
  console.log(id, name, price);
}
```

Si `Product.id` passe de `number` à `string`, ce code suit tout seul. Une annotation `id: number` locale serait devenue une erreur à corriger.

### Où annoter quand même

**1. Les signatures de fonctions.** TypeScript n'infère pas le type des paramètres depuis les appels : on les annote. Exceptions : une valeur par défaut (`base = 10` donne `number`) et un callback dont le contexte fournit déjà les types (`app.get('/x', (req, res) => …)`).

**2. Les littéraux d'objet.** Une annotation active la vérification des propriétés en trop (module 01) et place l'erreur **là où tu as fait la faute** :

```ts
const elmo: Product = {
  name: 'Tickle Me Elmo',
  id: '048188 627152',
  price: 28.99,
};
// ~~ id : Type 'string' is not assignable to type 'number'
```

Sans annotation, l'erreur apparaîtrait plus loin, à l'endroit où l'objet est utilisé.

**3. Le type de retour**, dans trois cas :

- **plusieurs `return`** : l'annotation garantit qu'ils renvoient la même chose ;
- **une API publique** : tu fixes le contrat avant d'écrire l'implémentation ;
- **un type nommé** : `add(a, b): Vector2D` s'affiche mieux que `{ x: number; y: number }`.

```ts
const cache: { [ticker: string]: number } = {};
function getQuote(ticker: string) {
  if (ticker in cache) {
    return cache[ticker];                 // number
  }
  return fetch(`https://quotes.example.com/?q=${ticker}`)
    .then((response) => response.json()); // Promise<any>
}
```

Le retour inféré est `number | Promise<any>` : l'appelant ne peut pas faire `getQuote('MSFT').then(…)`. En annotant `: Promise<number>`, l'erreur apparaît **dans la fonction**, sur le premier `return`, et la correction est évidente : `return Promise.resolve(cache[ticker])` (ou une fonction `async`).

### Une règle de lint

typescript-eslint propose `no-inferrable-types` qui signale les annotations redondantes sur des littéraux. Idéalement, les seules annotations de ton code sont celles des signatures et des littéraux d'objet.

## Pièges fréquents

- **Annoter chaque variable locale** : le code est plus long et moins facile à faire évoluer.
- **Annoter une constante avec un type plus large** que celui inféré (`const axis: string = 'x'`) : tu perds de la précision.
- **Laisser inféré le retour d'une fonction à plusieurs branches** : une branche oubliée (`return` d'un `number` au lieu d'une `Promise`) passe inaperçue.

## À retenir

- Ne pas écrire un type que TypeScript sait inférer.
- Annoter les paramètres, les littéraux d'objet et les retours des fonctions publiques ou à plusieurs branches.
- Une annotation bien placée fait apparaître l'erreur à l'endroit du bug.
