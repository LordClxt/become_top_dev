---
id: ts-ch04-l04
title: "Classes et curryfication : de nouveaux sites d'inférence"
source: { chapter: 3, pages: "132-136" }
duration_min: 25
concepts:
  - id: ts-generic-all-or-nothing
    label: "L'inférence des paramètres de type est tout ou rien : si tu en précises un, tu dois tous les préciser"
  - id: ts-class-inference-site
    label: "Une classe générique fixe un paramètre de type (l'API) à la construction ; ses méthodes génériques infèrent les autres (le chemin)"
  - id: ts-currying-inference-site
    label: "Une fonction qui renvoie une fonction (curryfication) crée un second site d'inférence : fetchAPI<API>()(path)"
glossary:
  - term: "site d'inférence"
    definition: "Endroit où TypeScript déduit les paramètres de type : chaque appel de fonction générique, chaque construction de classe générique."
  - term: "curryfication"
    definition: "Transformation d'une fonction à plusieurs paramètres en une suite de fonctions à un paramètre : f(a, b) devient f(a)(b)."
visuals: []
labs: [ts-ch04-l04-lab-api-fetcher]
extra: false
xp: 25
---

## Pourquoi c'est important

Un client d'API typé est un grand classique : tu décris les routes (`'/seeds'` renvoie `Seed[]`) et chaque appel connaît le type de sa réponse. Mais on tombe vite sur une limite de l'inférence des génériques. La contourner demande une astuce : **créer un nouveau site d'inférence**.

## Le concept

### Le problème : tout ou rien

```ts
export interface SeedAPI {
  '/seeds': Seed[];
  '/seed/apple': Seed;
  '/seed/strawberry': Seed;
}

declare function fetchAPI<API, Path extends keyof API>(path: Path): Promise<API[Path]>;

fetchAPI<SeedAPI>('/seed/strawberry');
//       ~~~~~~~ Expected 2 type arguments, but got 1
```

On voudrait préciser `API` et laisser TypeScript inférer `Path` depuis l'argument. Impossible : pour un appel donné, **soit** tu précises tous les paramètres de type, **soit** aucun. Et `API` n'apparaît dans aucun argument : il ne peut pas être inféré. Écrire les deux (`fetchAPI<SeedAPI, '/seed/strawberry'>('/seed/strawberry')`) est redondant. Donner une valeur par défaut à `Path` (`Path extends keyof API = keyof API`) fait taire l'erreur… mais le type de retour devient l'union de toutes les réponses : on perd la précision.

### Solution 1 : une classe

```ts
class ApiFetcher<API> {
  fetch<Path extends keyof API & string>(path: Path): Promise<API[Path]> {
    // …
  }
}

const fetcher = new ApiFetcher<SeedAPI>();
const berry = await fetcher.fetch('/seed/strawberry');   // Seed
fetcher.fetch('/seed/chicken');
//            ~~~~~~~~~~~~~~ Argument of type '"/seed/chicken"' is not assignable…
```

`API` est fixé à la construction ; `Path` est inféré à chaque appel de méthode. Deux sites d'inférence, deux paramètres.

### Solution 2 : la curryfication

```ts
function fetchAPI<API>() {
  return <Path extends keyof API & string>(path: Path) => fetchRaw(path) as Promise<API[Path]>;
}

const fetchSeed = fetchAPI<SeedAPI>();
const berry = await fetchSeed('/seed/strawberry');   // Seed
```

Le premier appel fixe `API`, la fonction renvoyée infère `Path`. Bonus : on peut créer des alias locaux dans la fonction externe (`type Routes = keyof API & string`) partagés par plusieurs fonctions internes.

### Classe ou fonction ?

Les deux fonctionnent. La classe est pratique si l'objet porte un état (une URL de base, un cache, des en-têtes). La curryfication est plus légère et compose bien. Le `& string` sert à exclure les clés `number` et `symbol` de `keyof` quand on construit une URL.

## Pièges fréquents

- **Préciser un seul paramètre de type sur deux** : erreur « Expected 2 type arguments ».
- **Un paramètre par défaut pour faire taire l'erreur** : le type de retour devient une union imprécise.
- **`keyof API` dans un gabarit de chaîne** : il peut contenir `number | symbol` ; utilise `keyof API & string`.

## À retenir

- L'inférence des paramètres de type est tout ou rien, par appel.
- Pour en fixer un et inférer l'autre, crée un second site d'inférence : une classe générique ou une fonction curryfiée.
