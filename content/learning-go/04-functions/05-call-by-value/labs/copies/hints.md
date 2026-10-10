## Hint 1
`Birthday` : le paramètre `p` est déjà une copie. Modifie-la puis renvoie-la : l'original est protégé sans rien faire de plus.

## Hint 2
`Without` et `Resize` doivent renvoyer une **nouvelle** slice : alloue avec `make`, puis copie les éléments voulus (boucle ou `copy`). Pour `Without`, saute simplement l'indice `i` en recopiant.

## Hint 3
`Reverse` : deux indices qui se rejoignent au milieu, `s[i], s[j] = s[j], s[i]`. `Clamp` : `for name, score := range scores { scores[name] = … }` est légal (modifier la valeur d'une clé existante pendant le parcours est permis). Les fonctions `min` et `max` prédéfinies bornent un entier.
