---
id: ts-ch03-l05
title: "Le rôle du contexte dans l'inférence"
source: { chapter: 3, pages: "115-119" }
duration_min: 25
concepts:
  - id: ts-context-inference
    label: "Une valeur écrite directement en argument est typée par le contexte (le paramètre attendu) ; extraite dans une variable, elle perd ce contexte et peut être élargie"
  - id: ts-context-tuples
    label: "Un tableau extrait dans une variable devient number[] ; as const le garde en tuple, mais readonly : le paramètre doit accepter readonly [number, number]"
  - id: ts-context-objects
    label: "Les propriétés d'un objet extrait sont élargies : on l'annote avec le type attendu (ou satisfies, ou as const)"
  - id: ts-context-callbacks
    label: "Un callback extrait dans une constante perd les types de paramètres fournis par le contexte : on annote la constante avec un type de fonction"
glossary:
  - term: "typage contextuel"
    definition: "Inférence d'un type à partir de l'endroit où une expression est utilisée (paramètre attendu, annotation de la variable) plutôt que de sa valeur seule."
visuals: []
labs: [ts-ch03-l05-lab-context]
extra: false
xp: 25
---

## Pourquoi c'est important

TypeScript n'infère pas un type à partir de la valeur seule : il tient compte de **l'endroit** où elle apparaît. Ce typage contextuel est pratique, mais il disparaît dès que tu **extrais** une expression dans une variable, ce qui produit des erreurs déroutantes sur du code qui « marchait » une ligne plus tôt.

## Le concept

### Extraire une valeur change son type

```ts
type Language = 'JavaScript' | 'TypeScript' | 'Python';
function setLanguage(language: Language) { /* … */ }

setLanguage('JavaScript');          // OK : le littéral est vérifié contre Language

let language = 'JavaScript';
setLanguage(language);
//          ~~~~~~~~ Argument of type 'string' is not assignable to parameter of type 'Language'
```

À la création de `language`, TypeScript ignore qu'elle servira de `Language` : il l'élargit à `string`. Deux corrections : annoter (`let language: Language = 'JavaScript'`) ou utiliser `const` (type `"JavaScript"`).

### Tuples

```ts
function panTo(where: [number, number]) { /* … */ }
panTo([10, 20]);           // OK

const loc = [10, 20];      // number[]
panTo(loc);                // erreur : number[] n'est pas un [number, number]
```

On peut annoter `const loc: [number, number] = [10, 20]`. Ou écrire `as const`… qui donne `readonly [10, 20]`, trop précis : **en lecture seule**, il n'est pas assignable à un tuple modifiable. La bonne correction est côté fonction, si elle ne modifie pas son argument : `panTo(where: readonly [number, number])` (module 02, readonly).

### Objets

```ts
interface GovernedLanguage { language: Language; organization: string }
function complain(language: GovernedLanguage) { /* … */ }

const ts = { language: 'TypeScript', organization: 'Microsoft' };
complain(ts);   // erreur : language est élargi à string
```

Correction : `const ts: GovernedLanguage = { … }`, ou `satisfies GovernedLanguage`, ou `as const`.

### Callbacks

```ts
function callWithRandomNumbers(fn: (n1: number, n2: number) => void) { fn(Math.random(), Math.random()); }

callWithRandomNumbers((a, b) => console.log(a + b));   // a, b : number (contexte)

const fn = (a, b) => console.log(a + b);
//          ~  ~ Parameter implicitly has an 'any' type
callWithRandomNumbers(fn);
```

Extrait, le callback perd son contexte. On annote les paramètres, ou mieux, toute la constante avec un type de fonction (module 02) : `const fn: (n1: number, n2: number) => void = (a, b) => …`.

### Quand c'est possible, garde la valeur en ligne

Le plus simple reste souvent de **ne pas extraire** la valeur : écrite directement en argument, elle profite du contexte sans annotation. Et si tu utilises `as const`, sache que l'erreur éventuelle apparaîtra **à l'utilisation** (l'appel de `panTo`), pas à la définition, alors qu'une annotation la signale à la définition.

## Pièges fréquents

- **Extraire une constante « pour la lisibilité »** et casser le typage : ajoute l'annotation qui portait le contexte.
- **Se battre avec `as const` sur un tuple** : si la fonction n'écrit pas dans son argument, son paramètre doit être `readonly`.
- **Un callback extrait sans type** : `noImplicitAny` le signale ; annote la constante avec un type de fonction.

## À retenir

- Le contexte d'utilisation participe à l'inférence ; l'extraction dans une variable le fait perdre.
- Corrections : annotation, `const`, `as const`, `satisfies`.
- Une fonction qui ne modifie pas un tuple doit l'accepter en `readonly`.
