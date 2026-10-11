## Hint 1
Pour voter, compare d'abord le terme de la dernière entrée ; seulement s'ils sont égaux, compare les index.

## Hint 2
Pour le recul : le premier essai porte prevLogIndex = nextIndex − 1 = 10. Un essai réussit quand le follower a l'entrée à cet index avec le bon terme.

## Hint 3
commitIndex = le plus grand index présent sur une majorité, à condition que l'entrée soit du terme courant. Sur 7 nœuds, trie les matchIndex (leader compris) et prends le 4ᵉ.
