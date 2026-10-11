## Hint 1
Écris une fonction récursive `insert(n, key, value)` qui renvoie `(cléPromue, nouvellePageDroite)` quand `n` éclate, et `("", nil)` sinon. `Put` ne s'occupe que du cas de la racine.

## Hint 2
Feuille qui éclate : `mid := len(keys)/2` ; la moitié droite est `keys[mid:]` avec ses valeurs ; la clé promue est `right.keys[0]` (et elle reste dans la feuille de droite). Page interne qui éclate : la clé `keys[mid]` monte et n'appartient plus à aucune des deux moitiés.

## Hint 3
Pour `Range`, parcours récursif : n'entre dans l'enfant `i` d'une page interne que si son intervalle `[keys[i-1], keys[i])` peut intersecter `[lo, hi)`.
