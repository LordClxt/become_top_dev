## Contexte

Relay, le mini-service de jobs que tu construis au fil du cours, a besoin de trois petites briques pour gérer la mémoire et le disque : lire une taille dans un fichier de configuration (`max_payload = 1.5MiB`), l'afficher dans les logs (`payload 1.5 KiB`) et alerter quand un quota est presque plein.

Tu les écris dans `size.go`, jalon par jalon.

## Jalon 1 : `ParseSize(s string) (int64, error)`

Convertit une taille en nombre d'octets.

| Unité | Valeur | Unité | Valeur |
|---|---|---|---|
| *(aucune)* ou `B` | 1 | `KiB` | 1 024 |
| `KB` | 1 000 | `MiB` | 1 048 576 |
| `MB` | 1 000 000 | `GiB` | 1 073 741 824 |
| `GB` | 1 000 000 000 | | |

Grammaire : chiffres, puis éventuellement `.` et au moins un chiffre, puis l'unité. Pas de signe, pas d'espaces, les unités sont sensibles à la casse.

Le calcul doit être **exact et en entiers** : `1.5KiB` vaut `1536`. Si le résultat n'est pas un nombre entier d'octets (`1.5B`, `0.1KiB`), c'est `ErrFraction`. Plus de 9 décimales : `ErrFraction` aussi.

| Erreur | Quand |
|---|---|
| `ErrFormat` | chaîne vide, pas de nombre, `.5`, `1.`, deux points, signe, espace de tête |
| `ErrUnit` | unité inconnue (`kb`, `TB`, ` KB`) |
| `ErrFraction` | taille non entière en octets |
| `ErrTooLarge` | dépasse `int64`, y compris après la multiplication par l'unité |

## Jalon 2 : `FormatSize(n int64) string`

Affiche `n` avec l'unité binaire la plus grande telle que la valeur reste ≥ 1 (`B`, `KiB`, `MiB`, `GiB`, `TiB`, `PiB`, `EiB`) :

```
512     → "512 B"
1536    → "1.5 KiB"
1048575 → "1023.9 KiB"   (décimale tronquée, jamais arrondie)
```

En dessous de 1024 : `"N B"` sans décimale. Les tailles négatives gardent leur signe devant. Tout `int64` doit marcher, `math.MinInt64` compris.

## Jalon 3 : `Percent` et `Level`

- `Percent(used, limit int64) float64` : la part de `used` dans `limit`, en pourcentage. `0` si `limit <= 0`.
- `Level(used, limit int64) string` : `"unlimited"` si `limit <= 0`, `"full"` à partir de 100 %, `"warn"` de 80 % à moins de 100 %, sinon `"ok"`. **`Level` doit être exact pour tous les `int64`** : au-delà de 2⁵³, un `float64` ne distingue plus deux entiers voisins, et `used * 100` peut déborder.

## Contraintes

- Aucun flottant dans `ParseSize` et `FormatSize`.
- Détecte le dépassement **avant** de multiplier.
- `Level` compare des entiers : n'utilise pas `Percent` pour décider.
