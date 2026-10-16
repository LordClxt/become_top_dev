## Hint 1
`append` : vérifie la longueur **avant** de toucher à quoi que ce soit, puis `this.#names.forEach((name, i) => …)` : la valeur i va dans la colonne `name`.

## Hint 2
`sortBy` : construis un tableau d'indices `0..n-1`, trie-le (le `sort` de JavaScript est stable) en comparant les colonnes de tri dans l'ordre, puis réécris chaque colonne avec `idx.map(j => col[j])`.

## Hint 3
`encode` : garde la valeur de la séquence courante (faux au départ) et un compteur. À chaque changement, pousse le compteur et repars à 1. Termine en poussant le dernier compteur si le bitmap n'est pas vide.
