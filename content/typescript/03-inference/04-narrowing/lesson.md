---
id: ts-ch03-l04
title: "Le rétrécissement de types et les alias"
source: { chapter: 3, pages: "106-115" }
duration_min: 35
concepts:
  - id: ts-narrowing-checks
    label: "TypeScript rétrécit une union après un test : null, throw, instanceof, in, Array.isArray, typeof"
  - id: ts-narrowing-pitfalls
    label: "typeof null vaut 'object', et un test de vérité exclut aussi 0 et '' : deux pièges de rétrécissement"
  - id: ts-tagged-union-switch
    label: "Une union taguée (propriété discriminante commune) se rétrécit avec un switch sur le tag"
  - id: ts-type-guard
    label: "Un type guard (x is T) permet de rétrécir avec une fonction, par exemple dans filter ; il n'est pas plus sûr qu'une assertion"
  - id: ts-alias-consistency
    label: "Rétrécir une propriété ne rétrécit pas un alias pris avant : utiliser l'alias de façon cohérente (décomposition)"
glossary:
  - term: "rétrécissement (narrowing)"
    definition: "Passage d'un type large à un type plus précis dans une branche de code, après un test que TypeScript comprend."
  - term: "type guard"
    definition: "Fonction dont le type de retour est un prédicat `param is T` : quand elle renvoie true, l'argument est rétréci en T."
visuals: []
labs: [ts-ch03-l04-lab-narrowing]
extra: false
xp: 35
---

## Pourquoi c'est important

L'élargissement (leçon 2) va du précis vers le large. Le **rétrécissement** fait l'inverse : dans une branche de code, TypeScript sait que la valeur appartient à un sous-ensemble de son type. C'est l'analyse de flux de contrôle, et c'est elle qui rend les unions utilisables au quotidien.

## Le concept

### Les tests que TypeScript comprend

```ts
const elem = document.getElementById('what-time-is-it');   // HTMLElement | null
if (elem) {
  elem.innerHTML = 'Party Time';                          // HTMLElement
} else {
  alert('No element');                                    // null
}
```

Même chose avec un `throw` (le reste de la fonction ne voit plus `null`), et avec :

```ts
if (value instanceof RegExp) { … }      // classes
if ('a' in ab) { … }                    // présence d'une propriété
if (Array.isArray(terms)) { … }         // tableaux
if (typeof val === 'string') { … }      // primitives
```

### Deux pièges

```ts
const el = document.getElementById('foo');
if (typeof el === 'object') {
  el;   // HTMLElement | null : typeof null vaut 'object' !
}

function foo(x?: number | string | null) {
  if (!x) {
    x;  // string | number | null | undefined : 0 et '' sont « falsy »
  }
}
```

### Unions taguées

La façon la plus robuste d'aider le vérificateur : une propriété **discriminante** commune.

```ts
interface UploadEvent { type: 'upload'; filename: string; contents: string }
interface DownloadEvent { type: 'download'; filename: string }
type AppEvent = UploadEvent | DownloadEvent;

function handleEvent(e: AppEvent) {
  switch (e.type) {
    case 'download': console.log('Download', e.filename); break;     // DownloadEvent
    case 'upload': console.log('Upload', e.contents.length); break;  // UploadEvent
  }
}
```

### Type guards définis par l'utilisateur

Quand TypeScript ne sait pas déduire, tu peux écrire un prédicat :

```ts
function isInputElement(el: Element): el is HTMLInputElement {
  return 'value' in el;
}
```

C'est très utile avec `filter`, qui ne rétrécit pas tout seul :

```ts
const members = ['Janet', 'Michael'].map((who) => jackson5.find((n) => n === who)); // (string | undefined)[]
const defined = members.filter((x): x is string => x !== undefined);             // string[]
```

Attention : TypeScript **croit** ton prédicat. S'il est faux, c'est une assertion déguisée. (Depuis TS 5.5, un `filter(x => x !== undefined)` simple est inféré automatiquement : `extra`.)

Une `Map` ne se rétrécit pas avec `has` : `if (m.has(k)) m.get(k)` reste `V | undefined`. Écris plutôt `const v = m.get(k); if (v !== undefined) …` ou `m.get(k) ?? défaut`.

### Aider le vérificateur

Quand TypeScript n'arrive pas à suivre un rétrécissement, demande-toi d'abord si le code peut être **réorganisé** pour qu'il le puisse (un test plus direct, une union taguée, une variable locale) avant de recourir à un type guard ou à une assertion.

### Les alias

```ts
function isPointInPolygon(polygon: Polygon, pt: Coordinate) {
  const box = polygon.bbox;
  if (polygon.bbox) {
    if (pt.x < box.x[0]) { … }
    //           ~~~ 'box' is possibly 'undefined'
  }
}
```

Le test porte sur `polygon.bbox`, pas sur `box` : ce sont deux références distinctes pour TypeScript. Règle d'or : **si tu crées un alias, utilise-le partout**. La décomposition le fait naturellement :

```ts
const { bbox } = polygon;
if (bbox) { const { x, y } = bbox; … }
```

Enfin, le rétrécissement **ne traverse pas les callbacks** : dans un `setTimeout(() => …)`, la valeur a pu changer entre-temps, et un appel de fonction n'invalide pas un rétrécissement sur une propriété (c'est un compromis pragmatique, donc une source d'unsoundness : module 07).

## Pièges fréquents

- **`typeof x === 'object'`** pour exclure `null` : ça ne l'exclut pas.
- **`if (!x)`** sur un nombre ou une chaîne : `0` et `''` passent aussi.
- **Un alias pris avant le test** : teste et utilise la même référence.
- **`m.has(k)` puis `m.get(k)!`** : préfère `get` puis un test, ou `??`.

## À retenir

- `null`, `throw`, `instanceof`, `in`, `Array.isArray`, `typeof` et les tags rétrécissent une union.
- Les unions taguées + `switch` sont la forme la plus lisible et la plus sûre.
- Un type guard (`x is T`) rétrécit via une fonction, mais TypeScript lui fait confiance.
- Utilise les alias de façon cohérente.
