## Hint 1
Écris une fonction `floorDiv(a, b)` qui arrondit vers −∞ : en Go, `/` tronque vers zéro. Une fenêtre tumbling commence à `floorDiv(t, size) * size`. Pour le hopping, pars du début le plus tardif, `floorDiv(t, hop) * hop`, et recule d'un `hop` tant que `début > t - size`.

## Hint 2
Garde les fenêtres ouvertes dans une `map[struct{key string; w Window}]*Result`. Dans `Add` : lis le watermark **avant** de mettre à jour le maximum, n'ajoute l'événement qu'aux fenêtres de fin > watermark, puis avance le maximum, puis émets (et supprime) toutes les fenêtres de fin ≤ nouveau watermark. Trie la sortie : l'ordre d'une map Go est aléatoire.

## Hint 3
`Sessionize` : copie la slice, trie-la par (clé, temps), puis parcours-la en prolongeant la dernière session tant que la clé est la même et que l'écart est < gap. Pour le consommateur : deux maps, `map[int]int64` (dernier offset par partition) et `map[string]int64` ; `Apply` compare à l'offset stocké **seulement s'il existe**, puis met à jour total et offset ensemble. `Checkpoint` et `Restore` recopient les maps élément par élément.
