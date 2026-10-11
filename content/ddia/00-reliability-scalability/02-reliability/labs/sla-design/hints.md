## Hint 1
En série, tous les composants sont nécessaires : multiplie les disponibilités. En parallèle, un seul suffit : multiplie les indisponibilités, puis passe au complémentaire.

## Hint 2
Pour le tuner, regarde d'abord lequel des deux curseurs fait baisser le plus la disponibilité des réplicas en parallèle : `1 − (1 − a)ⁿ`.

## Hint 3
Le répartiteur est en série : il ne peut que faire baisser l'ensemble. Il ne reste qu'une marge de 0,001 % pour passer sous 99,99 %.
