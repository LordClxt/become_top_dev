## Hint 1
Écris une méthode privée `#upgrade(stored: Doc): Doc` qui copie le document puis applique les upgraders de sa version à la version courante. `get`, `find` et `migrate` s'en servent toutes.

## Hint 2
Boucle `for (let v = version(d); v < this.currentVersion; v++)` : l'upgrader à appliquer est `this.#upgraders[v - 1]` ; après chaque pas, mets `d._v = v + 1`. Entoure l'appel d'un `try/catch` qui relève `new Error('…', { cause: e })`.

## Hint 3
Pour `lookup`, découpe le chemin avec `path.split('.')` et descends tant que la valeur est un objet (pas `null`, pas un tableau) qui possède la clé (`Object.hasOwn`). `migrate` trie les identifiants avec `[...this.#docs.keys()].sort()`.
