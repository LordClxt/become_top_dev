## Hint 1
`Append` : une boucle sur `t.names` ; la valeur i va dans `t.cols[t.names[i]]`. Vérifie la longueur avant de toucher à quoi que ce soit.

## Hint 2
`SortBy` : construis une slice d'indices `0..n-1`, trie-la avec `sort.SliceStable` en comparant les colonnes de tri dans l'ordre, puis réécris chaque colonne avec cet ordre.

## Hint 3
`Encode` : garde la valeur de la séquence courante (faux au départ) et un compteur. À chaque changement de valeur, ajoute le compteur à la liste et repars à 1. Termine en ajoutant le dernier compteur si le bitmap n'est pas vide.
