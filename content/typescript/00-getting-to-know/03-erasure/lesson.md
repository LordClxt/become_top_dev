---
id: ts-ch00-l03
title: "Les types sont effacés : la génération de code est indépendante"
source: { chapter: 1, pages: "11-18" }
duration_min: 30
concepts:
  - id: ts-type-erasure
    label: "Les types et annotations disparaissent à la compilation : on ne peut pas les tester à l'exécution (instanceof sur une interface)"
  - id: ts-tagged-union
    label: "Union taguée : une propriété littérale (kind) existe à l'exécution et permet à TypeScript d'affiner le type"
  - id: ts-emit-with-errors
    label: "Le JavaScript est produit même avec des erreurs de types ; la vérification et la génération sont deux étapes indépendantes"
  - id: ts-assertion-no-conversion
    label: "Une assertion (as number) est une opération de type : elle ne convertit rien à l'exécution"
  - id: ts-runtime-vs-declared
    label: "Le type à l'exécution peut différer du type déclaré (données réseau, JavaScript appelant) ; il faut valider aux frontières"
  - id: ts-overload-type-level
    label: "La surcharge TypeScript n'existe qu'au niveau des types : plusieurs signatures, une seule implémentation"
  - id: ts-zero-cost
    label: "Les types n'ont aucun coût à l'exécution (le coût est à la compilation)"
glossary:
  - term: "effacement (erasure)"
    definition: "Suppression par le compilateur des types, interfaces et annotations : il ne reste que du JavaScript."
  - term: "union taguée (discriminated union)"
    definition: "Union de types objets qui partagent une propriété littérale (la balise) permettant de savoir, y compris à l'exécution, de quelle variante il s'agit."
  - term: "assertion de type"
    definition: "Écriture `valeur as T` qui affirme au vérificateur un type sans rien vérifier ni convertir ; souvent appelée à tort « cast »."
  - term: "transpilation"
    definition: "Conversion d'un code source vers une version plus ancienne du même langage ou vers un autre langage de même niveau."
visuals: [ts-ch00-erasure]
labs: [ts-ch00-l03-lab-shapes-runtime]
extra: false
xp: 30
---

## Pourquoi c'est important

`tsc` fait deux choses : il **transforme** du TypeScript/JavaScript récent en JavaScript exécutable, et il **vérifie les types**. Ces deux activités sont **entièrement indépendantes**. Les types ne peuvent donc jamais modifier le JavaScript produit, et ce JavaScript est la seule chose qui s'exécute. Cette idée explique une série d'erreurs de débutant, et de confusions d'expert.

## Le concept

::visual{id="ts-ch00-erasure"}

### 1. On ne peut pas tester un type à l'exécution

Cette tentative semble naturelle quand on vient de Java :

```ts
interface Square { width: number }
interface Rectangle extends Square { height: number }
type Shape = Square | Rectangle;

function calculateArea(shape: Shape) {
  if (shape instanceof Rectangle) {   // 'Rectangle' only refers to a type, but is being used as a value
    return shape.height * shape.width;
  }
  return shape.width * shape.width;
}
```

`instanceof` s'exécute, mais `Rectangle` est un type : il n'existe plus. Le JavaScript généré contient `shape instanceof Rectangle` sans que `Rectangle` soit défini nulle part. Il te faut une information **qui existe aussi dans la valeur**. Trois solutions :

**Tester une propriété.** `'height' in shape` utilise une donnée présente à l'exécution, et TypeScript affine le type en conséquence :

```ts
function calculateArea(shape: Shape) {
  if ('height' in shape) return shape.width * shape.height;   // shape : Rectangle
  return shape.width * shape.width;                           // shape : Square
}
```

**Ajouter une balise (union taguée).** C'est l'outil le plus répandu de TypeScript :

```ts
interface Square { kind: 'square'; width: number }
interface Rectangle { kind: 'rectangle'; width: number; height: number }
type Shape = Square | Rectangle;

function calculateArea(shape: Shape) {
  switch (shape.kind) {
    case 'rectangle': return shape.width * shape.height;
    case 'square':    return shape.width * shape.width;
  }
}
```

**Utiliser une classe.** `class` est l'une des constructions qui créent **à la fois un type et une valeur** (le constructeur) : `instanceof Rectangle` fonctionne parce que `Rectangle` existe dans le JavaScript. Dans `type Shape = Square | Rectangle`, c'est le type ; dans `shape instanceof Rectangle`, c'est la valeur. Le module 01 apprend à les distinguer.

### 2. Un programme avec des erreurs de types produit quand même du JavaScript

```ts
let x = 'hello';
x = 1234;     // error TS2322, mais x.js est écrit
```

Les erreurs de types ressemblent aux *warnings* d'un compilateur C ou Java : probablement un vrai problème, mais le build continue. C'est pratique (tu testes une partie de l'appli pendant que l'autre est en travaux) et il est faux de dire que ton code « ne compile pas » : il **ne passe pas la vérification de types**. Vise zéro erreur avant chaque commit, pour ne pas devoir te rappeler quelles erreurs sont « normales ». Si tu veux bloquer la production en cas d'erreur, `noEmitOnError`.

### 3. Une opération de type n'a pas d'effet sur les valeurs

```ts
function asNumber(val: number | string): number {
  return val as number;    // accepté par le vérificateur…
}
```

Le JavaScript produit est `return val;`. **Aucune conversion** n'a lieu : `asNumber('42')` renvoie la chaîne `'42'`. `as number` est une assertion, parfois appelée à tort un « cast ». Pour convertir, utilise une construction JavaScript :

```ts
function asNumber(val: number | string): number {
  return Number(val);
}
```

### 4. Le type à l'exécution n'est pas forcément le type déclaré

```ts
function setLightSwitch(value: boolean) {
  switch (value) {
    case true: turnLightOn(); break;
    case false: turnLightOff(); break;
    default: console.log("I'm afraid I can't do that.");   // atteignable ?
  }
}
```

Oui. Un appelant JavaScript peut passer `"ON"`. Et même en TypeScript pur :

```ts
interface LightApiResponse { lightSwitchValue: boolean }

const result: LightApiResponse = await response.json();
setLightSwitch(result.lightSwitchValue);   // rien ne vérifie que le serveur envoie un booléen
```

Tu as *déclaré* le type de la réponse ; rien ne l'a *contrôlé*. Les données qui entrent dans ton programme (réseau, fichier, formulaire, JSON) doivent être **validées à la frontière**. Tu écriras un mini-validateur de schémas tout au long du cours : c'est le fil rouge.

### 5. Pas de surcharge fondée sur les types

En C++ ou en Java, deux fonctions peuvent différer seulement par le type de leurs paramètres. Pas ici, puisque les types sont effacés :

```ts
function add(a: number, b: number) { return a + b; }
function add(a: string, b: string) { return a + b; }   // Duplicate function implementation
```

TypeScript propose en revanche des *signatures* de surcharge, purement **au niveau des types**, pour **une seule** implémentation :

```ts
function add(a: number, b: number): number;
function add(a: string, b: string): string;
function add(a: any, b: any) {
  return a + b;
}

const three = add(1, 2);     // number
const twelve = add('1', '2'); // string
```

Seule l'implémentation survit dans le JavaScript. Le module 08 montrera qu'un type conditionnel est souvent préférable à une surcharge.

### 6. Aucun coût à l'exécution

Les types étant effacés, ils ne peuvent pas ralentir ton programme. Les seuls coûts sont à la **compilation** (que tu peux limiter, module 12) et dans le code ajouté pour viser de vieux moteurs JavaScript (générateurs en ES5, par exemple), qui dépend de la cible choisie, pas des types.

> **Au-delà du livre :** cette indépendance est devenue concrète avec Node.js 22+ : `node fichier.ts` exécute directement du TypeScript en **retirant** simplement les annotations, sans aucune vérification. C'est exactement ce que fait le sandbox de ce cours : `node` exécute les tests, et `tsc` vérifie les types séparément. L'option `erasableSyntaxOnly` garantit que ton code n'utilise que de la syntaxe effaçable (pas d'`enum`, pas de propriétés de paramètres).

## Pièges fréquents

- **`instanceof` sur une interface ou un alias de type** : erreur de compilation, car il n'y a rien à tester à l'exécution.
- **`as T` pour convertir** : le type change dans l'éditeur, pas la valeur.
- **Faire confiance à `await response.json()`** : le type annoncé est une promesse, pas une garantie.
- **Ignorer les erreurs de types sous prétexte que « ça tourne »** : le jour où elles ne sont plus de simples avertissements, tu ne les distingues plus des nouvelles.

## À retenir

- La génération de code est indépendante du système de types : les types ne changent jamais le comportement.
- Un programme avec des erreurs de types produit quand même du JavaScript ; `noEmitOnError` l'interdit.
- Pour connaître la variante d'une valeur à l'exécution, utilise une propriété (`in`), une balise (union taguée) ou une classe.
- `class` crée un type **et** une valeur ; `interface` et `type` ne créent qu'un type.
- Une assertion ne convertit rien ; valide les données qui franchissent la frontière du programme.
- Les types n'ont aucun coût à l'exécution.
