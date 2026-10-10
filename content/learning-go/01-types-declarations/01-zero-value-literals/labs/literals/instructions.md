## Contexte

Tu construis le lexer d'un petit langage de configuration qui reprend les littéraux entiers de Go. Avant de pouvoir évaluer `timeout = 1_500`, il faut lire correctement `1_500`, `0x1F` ou `0o755`.

## Ta mission

Dans `literal.go`, implémente :

```go
func ParseIntLiteral(s string) (int64, error)
```

Elle lit **un littéral entier sans signe** et renvoie sa valeur.

| Écriture | Base | Exemple | Valeur |
|---|---|---|---|
| chiffres | 10 | `42` | 42 |
| `0b` / `0B` | 2 | `0b1010` | 10 |
| `0o` / `0O` | 8 | `0o755` | 493 |
| `0x` / `0X` | 16 | `0xDEAD_BEEF` | 3735928559 |
| zéro initial + chiffres | 8 | `0755` | 493 |

## Règles

- Le caractère `_` n'est accepté qu'**entre deux chiffres**. `1_000` passe ; `_1`, `1_`, `1__0` sont des erreurs.
- Un préfixe doit être suivi d'au moins un chiffre : `0x` seul est une erreur.
- Chaque chiffre doit exister dans la base : `0b102`, `0o9`, `0xG1` et `08` sont des erreurs (le zéro initial de `08` rend le littéral octal, où 8 n'existe pas).
- Les lettres hexadécimales `a`–`f` s'écrivent en minuscules ou majuscules.
- Un littéral n'a pas de signe : `-5` et `+5` sont des erreurs. Pas d'espaces non plus.
- Un résultat qui dépasse `int64` est une erreur (`9223372036854775808`).
- Les flottants (`3.14`) ne sont pas des littéraux entiers : erreur.

## Contrainte

Lis les chiffres un par un, en construisant la valeur toi-même. Détecte le dépassement **avant** de multiplier, sinon la valeur déborde en silence.
