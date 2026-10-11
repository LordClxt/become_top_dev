## Hint 1
Le service n'écrit qu'à un seul endroit : la base de référence. Tout le reste en découle.

## Hint 2
Un seul log, deux consommateurs : chacun maintient son propre système dérivé.

## Hint 3
Un nouvel index ne voit que les changements futurs dans le log : il lui faut aussi l'instantané (flèche de lecture).
