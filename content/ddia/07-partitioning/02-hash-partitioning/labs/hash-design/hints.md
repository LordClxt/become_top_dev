## Hint 1
Chaque partition couvre la même largeur de hachages : divise 2³² par le nombre de partitions, puis situe la valeur.

## Hint 2
Après hachage, seule une requête sur une valeur précise de la clé (ou de la 1re colonne d'une clé composée) sait où aller.

## Hint 3
Pour la clé brûlante : charge totale / capacité d'une partition, arrondi au-dessus. Chaque lecture paie autant de sous-clés.
