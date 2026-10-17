## Contexte

Jalon 4 de **Parse**. Ce chapitre portait sur la circulation des types : constructions fonctionnelles, code asynchrone. Tu ajoutes trois briques : une transformation dont le type de sortie découle de la fonction, la validation d'un lot entier, et un schéma asynchrone.

Tu édites `parse.ts` (les jalons précédents sont fournis).

## Jalon 1 — `transform(inner, fn)`

Valide avec `inner`, puis applique `fn`. Le type de sortie est celui que renvoie `fn` (inféré). Si `fn` lève une `Error`, elle devient `ParseError(path, message)` : l'erreur est localisée (`$.at`).

## Jalon 2 — `partition(item, inputs)`

Valide chaque entrée sans s'arrêter : `{ valid, errors }`. Les chemins des erreurs commencent par l'indice de l'entrée (`$[1].age`). Écris-le en style fonctionnel (`map`, `flatMap`) plutôt qu'avec deux tableaux remplis dans un `forEach`.

## Jalon 3 — `refineAsync(inner, check, message)`

Renvoie un `AsyncSchema<T>` : `parseAsync(input)` valide avec `inner`, puis attend `check(value)` ; `false` → `ParseError('$', message)`. `parseAsync` est **toujours asynchrone** : une erreur de validation synchrone produit une promesse rejetée, jamais une exception directe.

## Contraintes

Pas de `any`. Les assertions `as` sont justifiées par un commentaire.
