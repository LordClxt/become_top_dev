---
id: ts-ch04-l03
title: "async/await plutôt que des callbacks"
source: { chapter: 3, pages: "127-132" }
duration_min: 30
concepts:
  - id: ts-async-over-callbacks
    label: "Les promesses et async/await donnent un code linéaire dont les types circulent, là où les callbacks imbriqués (pyramide) les perdent"
  - id: ts-promise-all-race
    label: "Promise.all se décompose en un tuple typé ; Promise.race avec un timeout(): Promise<never> garde le type du résultat (T | never = T)"
  - id: ts-async-always-async
    label: "Une fonction async renvoie toujours une promesse : jamais de fonction mi-synchrone qui appelle son callback tantôt tout de suite, tantôt plus tard"
  - id: ts-promise-cache
    label: "Mettre en cache la promesse (et non la valeur) évite de lancer deux fois la même requête quand deux appels se chevauchent"
glossary:
  - term: "Promise<never>"
    definition: "Promesse qui ne se résout jamais avec une valeur (elle rejette toujours) : dans une union, never disparaît."
  - term: "Zalgo"
    definition: "Surnom d'une API mi-synchrone, qui appelle son callback parfois immédiatement, parfois plus tard : source de bugs d'ordre."
visuals: []
labs: [ts-ch04-l03-lab-async]
extra: false
xp: 30
---

## Pourquoi c'est important

Le JavaScript asynchrone a longtemps reposé sur les callbacks, qui s'imbriquent en « pyramide » et dont l'ordre d'exécution ne correspond pas à l'ordre du code. Les promesses, puis `async`/`await`, ont tout aplati. Pour TypeScript, c'est aussi un gain : **les types circulent** à travers `await`, `Promise.all` et `Promise.race` sans annotation.

## Le concept

### La pyramide des callbacks

```ts
fetchURL(url1, function (response1) {
  fetchURL(url2, function (response2) {
    fetchURL(url3, function (response3) {
      console.log(1);
    });
    console.log(2);
  });
  console.log(3);
});
console.log(4);
// affiche 4, 3, 2, 1
```

Avec `async`/`await`, l'ordre du code est l'ordre d'exécution, et les erreurs passent par `try/catch` :

```ts
async function fetchPages() {
  try {
    const response1 = await fetch(url1);
    const response2 = await fetch(url2);
    const response3 = await fetch(url3);
  } catch (e) { /* … */ }
}
```

### En parallèle : Promise.all

```ts
async function fetchPages() {
  const [response1, response2, response3] = await Promise.all([fetch(url1), fetch(url2), fetch(url3)]);
}
```

TypeScript sait que chaque élément est une `Response` : la décomposition est typée.

### Le premier arrivé : Promise.race

```ts
function timeout(timeoutMs: number): Promise<never> {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject('timeout'), timeoutMs);
  });
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  return Promise.race([fetch(url), timeout(timeoutMs)]);
}
// Promise<Response>
```

`Promise.race` renvoie l'union des types, `Response | never`… et `never` est l'ensemble vide : l'union vaut `Response`. Aucun `as` nécessaire.

### Pas de fonction mi-synchrone

```ts
const _cache: { [url: string]: string } = {};
function fetchWithCache(url: string, callback: (text: string) => void) {
  if (url in _cache) {
    callback(_cache[url]);          // tout de suite…
  } else {
    fetchURL(url, (text) => {
      _cache[url] = text;
      callback(text);               // … ou plus tard
    });
  }
}
```

Le code appelant ne peut pas savoir dans quel ordre les choses se passent (`requestStatus` passe à `'success'` avant d'être mis à `'loading'` quand la valeur est en cache). Avec `async`, la fonction est **toujours** asynchrone :

```ts
async function fetchWithCache(url: string) {
  if (url in _cache) return _cache[url];
  const response = await fetch(url);
  const text = await response.text();
  _cache[url] = text;
  return text;
}
```

`async` garantit aussi qu'on ne renvoie jamais une `Promise<Promise<T>>` : renvoyer une promesse depuis une fonction `async` donne simplement `Promise<T>`.

### Bonus : cacher la promesse

La version ci-dessus a un défaut : deux appels simultanés pour la même URL lancent **deux** requêtes, car la valeur n'est en cache qu'à la fin. La solution est de mettre en cache la **promesse** elle-même, dès le premier appel (et de la retirer si elle échoue).

## Pièges fréquents

- **Enchaîner des `await` indépendants** : ils s'exécutent l'un après l'autre ; `Promise.all` les lance en parallèle.
- **`timeout()` typé `Promise<unknown>`** : `race` donnerait `Promise<unknown>`. `Promise<never>` est le bon type.
- **Une API qui appelle son callback de façon tantôt synchrone, tantôt asynchrone** : rends-la `async`.

## À retenir

- Préfère promesses et `async`/`await` aux callbacks : code linéaire, types qui circulent.
- `Promise.all` donne un tuple typé ; `Promise.race` + `Promise<never>` garde le type utile.
- Si une fonction renvoie une promesse, déclare-la `async`.
- Une fonction `async` est toujours asynchrone ; pour dédoublonner, cache la promesse.
