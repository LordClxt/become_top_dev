## Contexte

Une petite bibliothèque d'utilitaires sur les tuples et les objets. Son code d'exécution est **déjà correct**, mais ses types sont faibles (`unknown[]`, `Record<string, unknown>`). Une suite de tests de types (`tests/types.ts`, en lecture seule) décrit les types attendus, positifs et négatifs. Comme en TDD, tu écris les types jusqu'à ce que toute la suite passe.

Tu édites `tuples.ts`.

## À faire

1. `zip(a, b)` : pour deux tuples de même longueur, un tuple de paires (`zip([1, 2], ['a', 'b'])` → `[[1, 'a'], [2, 'b']]` au niveau des types, avec les littéraux) ; des longueurs différentes sont refusées.
2. `fromPairs(pairs)` : un objet dont les clés et les valeurs viennent des paires (littéraux conservés), aplati.
3. `invert(obj)` : échange clés et valeurs d'un objet de chaînes, aplati.
4. `Reverse<T>` et `reverse(tuple)` : un tuple inversé ; doit tenir 80 éléments (récursion terminale).
5. `head(tuple)` : le premier élément d'un tuple non vide ; un tuple vide est refusé.

## Contraintes

Ne modifie pas le comportement à l'exécution. Pas de `any`. Les assertions `as` sont permises dans les corps de fonctions (les types ne peuvent pas suivre ces calculs), avec un commentaire.
