## Contexte

Tu construis le moteur de calcul d'un outil de configuration : des expressions comme `2 ** 10` ou `7 % 3` doivent être évaluées, et les équipes doivent pouvoir **ajouter leurs propres opérateurs** sans toucher au code du moteur. C'est exactement le cas où une table de fonctions bat un `switch`.

## Ta mission

Dans `values.go`, implémente cinq fonctions. Le type `BinaryOp` et les erreurs sentinelles sont déjà déclarés.

### `Operators() map[string]BinaryOp`
Une table avec `+`, `-`, `*`, `/`, `%`. La division et le reste par zéro renvoient `ErrDivisionByZero`. **Chaque appel renvoie une nouvelle map** : modifier l'une ne doit pas toucher les autres.

### `Eval(expr string, ops map[string]BinaryOp) (int, error)`
Évalue `a op b` : exactement trois éléments séparés par des espaces (les espaces multiples sont tolérés).

| Erreur | Quand |
|---|---|
| `ErrFormat` | pas trois éléments, ou un opérande qui n'est pas un entier |
| `ErrOperator` | opérateur absent de `ops` (y compris quand `ops` est `nil`) |
| *(celle de l'opérateur)* | renvoyée telle quelle (par exemple `ErrDivisionByZero`) |

Enveloppe tes erreurs avec `fmt.Errorf("…: %w", …)` pour garder le contexte tout en restant testable avec `errors.Is`.

### `Apply`, `Filter`, `Reduce`
Les trois classiques de l'ordre supérieur, sans toucher à la slice d'entrée :

- `Apply(xs, f)` : une nouvelle slice avec `f` appliquée à chaque élément.
- `Filter(xs, keep)` : les éléments pour lesquels `keep` renvoie `true`, dans l'ordre.
- `Reduce(xs, initial, f)` : `acc = initial`, puis `acc = f(acc, x)` pour chaque `x`.

## Contrainte

Pas de `switch` sur l'opérateur : la table de fonctions est le sujet.
