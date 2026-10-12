## Hint 1
Un seul `replaceAll` suffit : `/(\\)?\$\{([^}]*)\}/` capture l'antislash éventuel et l'expression. Avec une closure `{ whole, escaped, expr -> … }`, `escaped` vaut `null` s'il n'y a pas d'antislash. Le remplacement renvoyé par la closure est pris littéralement.

## Hint 2
Découpe l'expression : `expr.split(/\|/)*.trim()` donne `[tête, filtre1, filtre2…]` ; puis la tête autour de `?:` (`head.split(/\?:/, 2)*.trim()`). Pour le chemin, `path.tokenize('.').inject(model) { obj, part -> obj?."$part" }` : `?."$part"` lit une propriété dont le nom est dans une variable, sur une map comme sur un objet.

## Hint 3
Pour le défaut, n'écris pas `value ?: fallback` : ça remplacerait `0` et `false`. Teste `value == null || (value instanceof CharSequence && !value.trim())`. Pour les filtres : `defaults + filters` donne une nouvelle map dont les entrées de droite l'emportent.
