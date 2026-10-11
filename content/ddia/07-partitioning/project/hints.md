## Hint 1
Le routeur n'a besoin que d'un tableau `owner[p]` : le rééquilibrage ne modifie que ce tableau, jamais `Partition(key)`. Pour `AddNode`, pars d'`Assignment()` et fais évoluer les listes au fil des vols.

## Hint 2
`PartitionOf` : avec les bornes basses triées, `sort.Search` trouve la première partition dont la borne est **strictement supérieure** à la clé ; la bonne est juste avant. Pour `Put`, `slices.BinarySearch` donne la position d'insertion et dit si la clé existe déjà.

## Hint 3
Découpage : après insertion, si `len(keys) > maxKeys`, `mid := len(keys)/2`, la nouvelle partition commence à `keys[mid]` avec `keys[mid:]` (copie), l'ancienne garde `keys[:mid]`, et on l'insère juste après dans `parts`. `Scan` : de `PartitionOf(from)` à `PartitionOf(to)`, en retirant la dernière si elle commence exactement à `to`.
