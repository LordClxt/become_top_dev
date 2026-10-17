---
id: ts-ch07-l02
title: "Cacher les assertions dangereuses dans des fonctions bien typées"
source: { chapter: 5, pages: "190-195" }
duration_min: 25
concepts:
  - id: ts-hidden-assertion
    label: "Une assertion nécessaire se place dans le corps d'une fonction dont la signature est précise : les appelants ne voient que le type exact"
  - id: ts-assertion-justified
    label: "Chaque assertion porte un commentaire qui explique pourquoi elle est sûre, et la fonction est testée"
  - id: ts-generic-wrapper-assertion
    label: "Un wrapper générique (cacheLast<F>(fn: F): F) ne peut souvent pas être prouvé correct par TypeScript : une seule assertion interne suffit"
glossary:
  - term: "assertion de type"
    definition: "Expression `valeur as T` : demande à TypeScript de considérer la valeur comme un T, sans vérification à l'exécution."
visuals: []
labs: [ts-ch07-l02-lab-hidden-assertions]
extra: false
xp: 25
---

## Pourquoi c'est important

Parfois, tu sais une chose que TypeScript ne peut pas prouver : une API renvoie bien un `MountainPeak`, un cache renvoie bien le résultat de la fonction. Une assertion est alors légitime. La question est **où** la mettre : pas dans chaque appelant, mais dans **une** fonction bien typée, documentée et testée.

## Le concept

### Une signature propre, une assertion dedans

```ts
interface MountainPeak { name: string; continent: string; elevationMeters: number; firstAscentYear: number }

async function checkedFetchJSON(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to fetch! ${response.statusText}`);
  return response.json();
}

export async function fetchPeak(peakId: string): Promise<MountainPeak> {
  return checkedFetchJSON(`http://peaks.example.com/peaks/${peakId}`) as Promise<MountainPeak>;
}
```

Sans l'annotation, `fetchPeak` renverrait `Promise<unknown>` et **chaque** appelant devrait asserter. Avec, l'assertion est unique, visible, et les appelants profitent d'un type exact. Si tu peux, valide en plus quelques champs à l'exécution (le module suivant et le module 12 vont plus loin).

### Les wrappers génériques

Cet exemple vient de la 1ʳᵉ édition du livre (la 2ᵉ s'appuie sur `fetchPeak` et `shallowObjectEqual`) ; il reste le cas d'école. Une fonction qui mémorise le dernier appel :

```ts
declare function shallowEqual(a: unknown, b: unknown): boolean;

function cacheLast<F extends Function>(fn: F): F {
  let lastArgs: any[] | null = null;
  let lastResult: any;
  return function (...args: any[]) {
    //   ~~~~~~~ Type '(...args: any[]) => any' is not assignable to type 'F'
    if (!lastArgs || !shallowEqual(lastArgs, args)) {
      lastResult = fn(...args);
      lastArgs = args;
    }
    return lastResult;
  };
}
```

TypeScript ne peut pas relier la fonction renvoyée au type générique `F`. La signature est exacte du point de vue des appelants : on ajoute **une** assertion (`as unknown as F`) dans le corps, avec un commentaire, et on teste.

### Une assertion ciblée plutôt qu'un paramètre any

```ts
function shallowObjectEqual(a: object, b: object): boolean {
  for (const [k, aVal] of Object.entries(a)) {
    if (!(k in b) || aVal !== (b as any)[k]) {
      // `k in b` garantit que la propriété existe ; on ne lit que des propriétés propres de b.
      return false;
    }
  }
  return Object.keys(a).length === Object.keys(b).length;
}
```

Taper `b: any` aurait été plus simple, mais aurait accepté `null` (et planté). L'assertion est limitée à **une** expression, justifiée par un commentaire.

## Pièges fréquents

- **Laisser une fonction renvoyer `unknown` ou `any`** et asserter dans chaque appelant.
- **Une assertion sans commentaire** : le prochain lecteur ne sait pas pourquoi elle est sûre.
- **Un paramètre `any` pour éviter une assertion** : il élargit la surface dangereuse.
- **Ne pas tester** la fonction qui contient l'assertion : c'est le seul garde-fou.

## À retenir

- Place les assertions inévitables dans des fonctions aux signatures précises.
- Justifie chaque assertion par un commentaire et teste la fonction.
- Une assertion ciblée sur une expression vaut mieux qu'un paramètre `any`.
