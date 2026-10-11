## Hint 1
Écris une fonction qui copie un `Doc` (copie superficielle suffit) avant de remplacer ses champs de référence.

## Hint 2
Pour `Expand`, commence par `GetMany(coll, ids)` ; pour chaque champ de `refs`, collecte les identifiants distincts avec un ensemble (`map[string]bool`) et appelle `GetMany` une fois.

## Hint 3
Construis `resolved[field][id]` avant de produire le résultat : la boucle finale sur `ids` ne doit plus appeler la base.
