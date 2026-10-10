## Hint 1
Regarde où part la première ligne `1 2 3` : elle devient la dernière colonne, lue de haut en bas.

## Hint 2
Déclare `var out Grid`, puis parcours chaque case `(r, c)` de la grille d'entrée avec deux boucles imbriquées. Trouve dans quelle case `(r2, c2)` de `out` elle doit aller.

## Hint 3
La case de la ligne `r`, colonne `c` va à la ligne `c`, colonne `2 - r` : `out[c][2-r] = g[r][c]`.
