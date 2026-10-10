## Hint 1
Une double boucle compare chaque tag de `a` à chaque tag de `b` : avec 100 000 tags, c'est 10 milliards de comparaisons. Une map permet de tester la présence en temps constant.

## Hint 2
Range les tags de `a` dans un set `map[string]bool`. Parcours ensuite `b` : un tag présent dans le set est commun. Attention aux doublons de `b`.

## Hint 3
Après avoir ajouté un tag commun au résultat, supprime-le du set (`delete`) pour ne pas l'ajouter deux fois. Termine par `slices.Sort(out)`.
