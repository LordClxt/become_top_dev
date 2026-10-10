## Contexte

Tu écris la petite bibliothèque d'utilitaires de Relay. Elle sert à résumer des mesures et à afficher des listes. Chaque fonction exerce une facette de la déclaration de fonction en Go : paramètres variadiques, valeurs de retour multiples, retours nommés et struct d'options.

## Ta mission

Dans `signatures.go`, implémente trois fonctions.

### `MinMax(vals ...int) (lo, hi int, ok bool)`
Renvoie la plus petite et la plus grande valeur. `ok` vaut `false` s'il n'y a aucune valeur (dans ce cas `lo` et `hi` valent 0).

Les retours s'appellent volontairement `lo` et `hi` : `min` et `max` sont des identifiants prédéclarés que tu masquerais.

### `Stats(vals ...float64) (mean, median float64, err error)`
Moyenne et médiane. La médiane d'un nombre pair de valeurs est la moyenne des deux valeurs centrales. Sans valeur : `ErrNoValues`.

**Contrainte importante :** `Stats` ne doit jamais modifier les valeurs de l'appelant. Quand on l'appelle avec `Stats(xs...)`, la fonction reçoit **la même slice** que l'appelant : trier `vals` en place trierait `xs`.

### `Join(items []string, opts FormatOptions) string`
Assemble `items` selon une struct d'options (le moyen de Go pour avoir des paramètres nommés et optionnels) :

| Champ | Effet | Valeur zéro |
|---|---|---|
| `Prefix` | ajouté devant **chaque** élément | rien |
| `Separator` | entre les éléments | `","` |
| `Max` | nombre maximum d'éléments affichés | `0` ou moins = pas de limite |

Quand il y a plus de `Max` éléments, affiche les `Max` premiers puis un dernier élément `…(+N)` où `N` est le nombre d'éléments omis. Ce marqueur n'a pas de préfixe.

```
Join([a b c], {})                      → "a,b,c"
Join([a b c], {Prefix: "#", Max: 2})   → "#a,#b,…(+1)"
```

## Contrainte

N'utilise pas de retour nu.
