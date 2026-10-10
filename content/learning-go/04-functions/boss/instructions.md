## Contexte

Relay doit calculer des expressions saisies par ses utilisateurs : `sqrt(x ^ 2 + y ^ 2)`, `max(1, min(5, 3) * 2)`, `2 * pi`. Pas question de lancer un interpréteur complet : tu écris une petite calculatrice scientifique, avec une grammaire précise et des erreurs bien typées. C'est l'occasion de tout combiner : tables de fonctions, variadiques, closures, retours multiples.

## Ta mission

Dans `calc.go`, implémente :

```go
func Eval(expression string, vars map[string]float64) (float64, error)
```

`vars` donne la valeur des noms utilisables dans l'expression (`pi`, `x`…). Il peut être `nil` et ne doit **jamais être modifié**.

### Grammaire

```
expression := terme   (('+' | '-') terme)*
terme      := unaire  (('*' | '/') unaire)*
unaire     := '-' unaire | puissance
puissance  := primaire ('^' unaire)?          ← associatif à droite
primaire   := nombre
            | nom
            | nom '(' [ expression (',' expression)* ] ')'     ← appel de fonction
            | '(' expression ')'
```

- **nombre** : des chiffres, avec éventuellement un point suivi d'**au moins un chiffre** (`3.25` oui ; `.5` et `5.` non).
- **nom** : une lettre ou `_`, suivie de lettres, chiffres ou `_`. Suivi d'une parenthèse ouvrante, c'est un appel de fonction ; sinon c'est une variable.
- Les espaces sont ignorés. Il n'y a pas de `+` unaire.

Conséquences à connaître :

| Expression | Valeur | Pourquoi |
|---|---|---|
| `2 ^ 3 ^ 2` | 512 | `^` s'associe à droite : `2 ^ (3 ^ 2)` |
| `-2 ^ 2` | −4 | le moins unaire s'applique après la puissance |
| `2 ^ -1` | 0,5 | l'exposant est un `unaire`, il peut être négatif |
| `10 - 3 - 2` | 5 | `-` s'associe à gauche |

### Fonctions

| Fonction | Arguments | Résultat |
|---|---|---|
| `abs(x)` | 1 | valeur absolue |
| `sqrt(x)` | 1 | racine carrée (`x ≥ 0`) |
| `pow(a, b)` | 2 | `a` puissance `b` |
| `max(...)`, `min(...)` | 1 ou plus | plus grand / plus petit |
| `sum(...)` | 0 ou plus | somme (`sum()` vaut 0) |
| `avg(...)` | 1 ou plus | moyenne |

### Erreurs

Chaque erreur doit être testable avec `errors.Is`. Tu peux les enrichir avec `fmt.Errorf("…: %w", …)`.

| Erreur | Quand |
|---|---|
| `ErrSyntax` | expression vide, jeton inattendu, parenthèse non fermée, jeton en trop, nombre mal formé, caractère inconnu… |
| `ErrUnknownName` | variable ou fonction inconnue (un nom de fonction sans parenthèses est une variable) |
| `ErrDivisionByZero` | division par zéro |
| `ErrDomain` | `sqrt` d'un négatif, ou une puissance dont le résultat est infini ou non défini (`0 ^ -1`, `(-8) ^ 0.5`) |
| `ErrArity` | mauvais nombre d'arguments pour une fonction |

## Conseils d'architecture

- Découpe d'abord l'entrée en **jetons** (nombres, noms, opérateurs).
- Écris un **analyseur à descente récursive** : une fonction par règle de la grammaire, qui consomme les jetons et renvoie `(valeur, erreur)`. Des closures qui partagent la position courante, ou toute autre approche, conviennent.
- Garde les fonctions dans une **table** (map nom → description avec bornes d'arguments et calcul) : ajouter `floor` ne doit coûter qu'une ligne.
- Arrête-toi à la **première** erreur, et vérifie qu'il ne reste pas de jeton après l'expression complète.
