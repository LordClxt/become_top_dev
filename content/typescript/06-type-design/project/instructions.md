## Contexte

Jalon 6 de **Parse**. Ce chapitre portait sur la conception de types : objets de paramètres plutôt que paramètres répétés, exactitude plutôt que précision illusoire, types récursifs. Tu appliques ces principes à trois nouvelles briques.

Tu édites `parse.ts` (les jalons précédents sont fournis).

## Jalon 1 — `numberIn({ min, max, integer })`

Un nombre contraint, configuré par un **objet** d'options : `numberIn(0, 100, true)` serait illisible et facile à inverser. Messages : `un entier est attendu`, `un nombre ≥ 0 est attendu`, `un nombre ≤ 100 est attendu`.

## Jalon 2 — `json()`

Valide n'importe quelle valeur JSON et produit le type récursif `Json` (fourni). Le type est **exact** : `undefined`, les fonctions, `NaN`, `Infinity`, les `bigint`, les `Date` ou les `Map` (objets de classe) sont refusés. Seuls les objets simples (prototype `Object.prototype` ou `null`) sont acceptés. Les chemins d'erreur descendent dans la structure (`$[1].a`).

## Jalon 3 — `lazy(factory)`

Un schéma qui se référence lui-même (une catégorie contient des catégories) ne peut pas être construit directement : la variable n'existe pas encore. `lazy(() => …)` n'appelle la fabrique qu'à la **première** validation, puis réutilise le schéma obtenu. Le type doit être annoté par l'appelant (`const category: Schema<Category> = lazy(…)`) : TypeScript ne peut pas inférer un type circulaire.

## Contraintes

Pas de `any`. Les assertions `as` sont justifiées par un commentaire.
