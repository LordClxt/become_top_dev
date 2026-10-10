## Contexte

Tu construis un outil pour apprendre le débordement : l'utilisateur tape `127 + 1`, choisit une largeur (8, 16, 32 ou 64 bits) et la calculatrice dit si le résultat tient dans un entier signé de cette taille, sans jamais se tromper.

## Ta mission

Dans `calc.go`, implémente :

```go
func Eval(expr string, bits int) (int64, error)
```

### Format de l'expression

Exactement trois éléments séparés par des espaces : `a op b`. Les espaces multiples ou en bordure sont tolérés.

- **Opérandes** : entiers décimaux, avec un `-` optionnel devant. Ni `+`, ni flottants, ni hexadécimal, ni underscores.
- **Opérateurs** : `+`, `-`, `*`, `/`, `%`, avec la division de Go (tronquée vers zéro).

### Largeur

`bits` vaut 8, 16, 32 ou 64 ; la plage est celle d'un entier signé de cette taille (pour 8 bits : −128 à 127).

### Erreurs

Chaque erreur doit pouvoir être testée avec `errors.Is` :

| Erreur | Quand |
|---|---|
| `ErrWidth` | `bits` n'est pas 8, 16, 32 ou 64 |
| `ErrSyntax` | l'expression n'a pas la bonne forme (mauvais nombre d'éléments, opérateur inconnu, opérande non décimal) |
| `ErrRange` | un **opérande** ne tient pas dans la largeur demandée (ou dépasse `int64`) |
| `ErrDivisionByZero` | `/` ou `%` avec un diviseur nul |
| `ErrOverflow` | le **résultat** ne tient pas dans la largeur demandée |

Ajoute du contexte aux erreurs avec `fmt.Errorf("…: %w", ErrXxx)` pour que le message soit utile **et** que `errors.Is` fonctionne.

## Pièges à anticiper

- En 64 bits, il n'existe pas de type plus grand pour « vérifier après coup ». Détecte le débordement **avant** qu'il ait lieu, ou à partir du résultat et des opérandes.
- `−2⁶³ / −1` déborde, alors que ce n'est ni une addition ni une multiplication.
- `16 * 16` vaut `256`, qui fait `0` en 8 bits : un résultat nul ne prouve rien.
