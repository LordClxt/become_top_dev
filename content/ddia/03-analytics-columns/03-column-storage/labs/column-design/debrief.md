**Le stockage en colonnes réduit ce que l'on lit, et la compression le réduit encore.** Avec 100 colonnes dont 3 utiles, le stockage par lignes lit 800 Go, le stockage par colonnes 24 Go : 33 fois moins.

Les bitmaps rendent le filtrage presque gratuit : `IN` se résout par un **OU** de bitmaps, `AND` par un **ET**. Cela fonctionne parce que toutes les colonnes gardent le **même ordre de lignes** — le k-ième bit désigne la même ligne partout. Un bitmap creux se compresse par run-length encoding (`110000100` → longueurs `0 2 4 1 2`).

Enfin, les « familles de colonnes » de Bigtable ne sont pas du vrai stockage en colonnes : elles gardent les colonnes d'une ligne ensemble.
