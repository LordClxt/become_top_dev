## Contexte

Tu programmes le cerveau d'un petit robot d'entrepôt. Il reçoit une liste d'ordres textuels, se déplace sur une grille et analyse des relevés de capteurs. Chaque fonction exerce une facette du contrôle de flux : `switch` sans expression, `switch` dans un `for` avec label, `continue` et `break` avec label.

## Ta mission

Dans `switches.go`, implémente quatre fonctions.

### `Grade(score int) string`
`A` à partir de 90, `B` à partir de 80, `C` à partir de 70, `D` à partir de 60, `F` sinon. Une note hors de 0 à 100 donne `"invalid"`. *(Un `switch` sans expression.)*

### `Run(commands []string) (Position, error)`
Exécute les ordres dans l'ordre, à partir de `{0, 0}`.

| Ordre | Effet |
|---|---|
| `up`, `north` | `Y + 1` |
| `down`, `south` | `Y - 1` |
| `right`, `east` | `X + 1` |
| `left`, `west` | `X - 1` |
| `reset` | retour à `{0, 0}` |
| `noop`, `""` | ne fait rien |
| `stop` | arrête l'exécution : les ordres suivants sont ignorés |
| autre | arrête l'exécution et renvoie la position atteinte avec l'erreur `unknown command "…"` |

Les ordres sont sensibles à la casse. *(Un `switch` dans un `for` : attention à ce que fait `break` dans un `case`.)*

### `FirstAllPositiveRow(grid [][]int) int`
Indice de la première ligne **non vide** dont toutes les valeurs sont strictement positives, ou `-1`. *(Un `continue` avec label.)*

### `CountUntilNegative(grid [][]int) int`
Parcourt la grille ligne par ligne, compte les valeurs strictement positives, et s'arrête **complètement** à la première valeur négative (exclue). Les zéros sont ignorés. *(Un `break` avec label.)*

## Contraintes

- Pas de variable booléenne « drapeau » pour sortir des boucles : utilise les labels.
- Dans `Run`, un seul `switch` regroupe les synonymes avec des virgules.
