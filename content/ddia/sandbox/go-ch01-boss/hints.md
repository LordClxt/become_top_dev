## Hint 1
Écris `match(motif, fait, liaisons)` qui renvoie les liaisons étendues ou `false`. Constante : égalité stricte. Variable : soit déjà liée (même valeur exigée), soit nouvelle liaison. Pense à **copier** la map de liaisons à chaque essai.

## Hint 2
Résolution du corps : récursion sur la liste d'atomes. Pour le premier atome, essaie chaque fait de même prédicat ; à chaque succès, résous le reste avec les liaisons étendues. Une liste vide d'atomes renvoie les liaisons courantes.

## Hint 3
`Eval` : un ensemble de clés `String()` pour dédupliquer ; une boucle « tant qu'un tour a ajouté un fait » qui applique chaque règle sûre sur la base courante. Le tri final se fait avec `slices.SortFunc` sur `String()`.
