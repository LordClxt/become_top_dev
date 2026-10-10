## Hint 1
Le stock se consulte par SKU : transforme-le d'abord en `map[string]int`. Ce sera ta copie de travail, donc `stock` reste intact.

## Hint 2
Pour le « tout ou rien », calcule d'abord le besoin total de la commande par SKU (une petite map), vérifie que chaque besoin est couvert, et seulement ensuite décrémente le stock.

## Hint 3
Pour `Remaining`, parcours la map, garde les quantités > 0 dans une slice pré-allouée, puis `slices.SortFunc` par SKU. N'oublie pas d'initialiser les slices du résultat à `[]string{}` / `[]Item{}`.
