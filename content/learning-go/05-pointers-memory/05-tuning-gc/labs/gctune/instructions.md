## Contexte

Relay lit sa configuration mémoire dans l'environnement : `GOGC` et `GOMEMLIMIT`. Avant de les passer au runtime, il veut les valider, calculer à quelle taille de tas le prochain ramasse-miettes se déclenchera, et vérifier que la limite laisse de la marge. Ce sont des calculs sur de très grands entiers : le débordement n'est pas un cas théorique.

## Ta mission

Dans `gctune.go`, implémente cinq fonctions.

### `NextGCTarget(heap uint64, gogc int) uint64`
`heap + heap × gogc / 100`. Si `gogc` est négatif (`GOGCOff`), le GC ne se déclenche jamais : `math.MaxUint64`. **Le résultat sature à `MaxUint64` au lieu de déborder**, même quand le produit `heap × gogc` dépasse 64 bits.

```
NextGCTarget(200 MiB, 100) = 400 MiB     NextGCTarget(1<<63, 100) = MaxUint64
```

*(Le paquet `math/bits` offre un produit sur 128 bits et une division qui l'accepte.)*

### `ParseMemLimit(s string) (uint64, error)`
Des chiffres suivis d'un suffixe facultatif : `B`, `KiB`, `MiB`, `GiB` ou `TiB`, **sensibles à la casse**. `"3GiB"` vaut `3 × 2³⁰`. Erreurs : chaîne vide, pas de nombre, suffixe inconnu (`GB`, `gib`), signe, espace, virgule, valeur qui déborde 64 bits.

### `ReadGCSettings(env map[string]string) (GCSettings, error)`
- `GOGC` absent ou vide : `100`. `"off"` : `GOGCOff`. Sinon un entier `≥ 0`.
- `GOMEMLIMIT` absent ou vide : `NoLimit`. Sinon `ParseMemLimit`.
- Les autres variables sont ignorées. Une valeur invalide est une erreur qui cite le nom de la variable.

### `EffectiveTarget(heap uint64, s GCSettings) uint64`
La taille de tas qui déclenchera réellement le prochain cycle : le déclenchement de `GOGC`, ramené à la limite mémoire si celle-ci est plus basse.

### `CheckLimit(limit, physical uint64) (safe bool, err error)`
`safe` est vrai si la limite reste à **90 % ou moins** de la mémoire physique (le calcul `physical × 9 / 10` ne doit pas déborder). Une limite nulle donne `ErrInvalidLimit`.

## Contrainte

Aucune conversion en `float64` : les valeurs dépassent 2⁵³ et perdraient de la précision.
