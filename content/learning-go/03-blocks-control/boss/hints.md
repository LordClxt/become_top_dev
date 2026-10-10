## Hint 1
Commence par une fonction qui parcourt le programme avec une pile d'indices : chaque `[` empile sa position, chaque `]` dépile et enregistre le couple dans une `map[int]int` dans les deux sens. Une pile vide à la lecture d'un `]`, ou non vide à la fin, signale `ErrUnbalanced`.

## Hint 2
La boucle principale : `for pc := 0; pc < len(program); pc++` et un `switch program[pc]`. Les caractères inconnus doivent être ignorés **avant** de compter une étape (un `continue` dans le `default`, ou un premier `switch` qui filtre). Incrémente le compteur d'étapes pour chaque instruction reconnue et compare-le à `maxSteps`.

## Hint 3
Sur `[` avec une case nulle, place `pc` sur le `]` correspondant : le `pc++` de la boucle te fera passer à l'instruction suivante. Sur `]` avec une case non nulle, place `pc` sur le `[` correspondant (le `pc++` te met sur l'instruction qui suit le `[`, ce qui est exactement le comportement voulu). Pour le pointeur, teste les bornes juste après l'avoir déplacé.
