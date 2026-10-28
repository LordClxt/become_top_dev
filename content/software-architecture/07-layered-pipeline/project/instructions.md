## archkit, épisode 8

McIlroy a battu dix pages de Pascal avec six commandes shell. Cet épisode donne à archkit la même puissance de composition, en TypeScript : des filtres sur des **itérables asynchrones**.

Un `Filter<I, O>` prend un `AsyncIterable<I>` et renvoie un `AsyncIterable<O>`. Les filtres doivent être **paresseux** : rien n'est lu tant que l'aval ne le demande pas. Les générateurs asynchrones (`async function*`) le font naturellement.

### Jalon 1
- `map(f)` (transformateur, `f` peut être asynchrone), `keep(pred)` (testeur), `take(n)`.
- `compose(...filters)` enchaîne de gauche à droite ; `compose()` laisse tout passer.
- `collect(flux)` (consommateur) renvoie un tableau.
- `take(n)` doit **arrêter de lire** l'amont après n éléments, et l'amont doit être **refermé** (son `finally` s'exécute) : c'est le `sed ${1}q` de McIlroy.

### Jalon 2
- `dispatch(routes, onDrop?)` : pour chaque élément, la **première** route dont `when` est vrai le transforme avec `then` ; sans route, l'élément est écarté et passé à `onDrop`. L'ordre est conservé. Ajouter une route ne modifie aucune autre.
- `batch(size)` regroupe en lots (le dernier peut être plus petit).

### Jalon 3
- `words()` : chaque suite de lettres ASCII est un mot (`tr -cs A-Za-z '\n'`).
- `lowercase()`.
- `countSorted()` : `[mot, fréquence]`, par fréquence décroissante puis ordre alphabétique (`sort | uniq -c | sort -rn`).
- `topWords(n)` : la composition des précédents et de `take(n)`.
