## Hint 1
Une mise à jour d'une clé déjà en memtable n'ajoute pas de clé distincte.

## Hint 2
Une pierre tombale termine la recherche : la clé est considérée supprimée.

## Hint 3
Le coût moyen d'un filtre de Bloom pour une clé absente est le nombre de segments × son taux de faux positifs.
