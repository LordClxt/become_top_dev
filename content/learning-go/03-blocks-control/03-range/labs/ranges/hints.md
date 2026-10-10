## Hint 1
`for offset, r := range s` te donne déjà la rune et son décalage en octets : `RuneOffsets` et `FirstRepeat` sont presque cette boucle. Pour `FirstRepeat`, garde un ensemble (`map[rune]bool`) des runes déjà vues.

## Hint 2
`DoubleAll` : la variable de valeur est une copie, passe par l'indice : `for i := range xs { xs[i] *= 2 }`. Pour `WordCounts`, compte d'abord dans une `map[string]int`, puis recopie dans une slice de `WordCount`.

## Hint 3
Trie la slice avec `slices.SortFunc` : la fonction de comparaison renvoie un nombre négatif, nul ou positif. Compare d'abord les compteurs (`b.Count - a.Count` pour le tri décroissant), puis les mots avec `strings.Compare`. Pour nettoyer un mot : `strings.Trim(mot, ".,;:!?\"'()[]")`.
