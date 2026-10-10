## Hint 1
`bits.Mul64(x, y)` renvoie le produit exact sous la forme `(hi, lo)` de deux `uint64`. `bits.Div64(hi, lo, d)` divise ce nombre de 128 bits par `d` et renvoie `(quotient, reste)` ; elle panique si `hi >= d`, donc teste ce cas avant. `bits.Add64` détecte la retenue d'une addition.

## Hint 2
`ParseMemLimit` : avance tant que le caractère est un chiffre pour séparer le nombre du suffixe. Une map `suffixe → multiplicateur` (avec `""` et `"B"` pour 1) évite un `switch` à rallonge. Après `strconv.ParseUint`, multiplie avec `bits.Mul64` et refuse un `hi` non nul.

## Hint 3
`ReadGCSettings` : lis `env["GOGC"]` avec un `switch` sans expression (vide, `"off"`, sinon `strconv.Atoi` + test `< 0`). `EffectiveTarget` est `min(NextGCTarget(...), s.MemLimit)`. `CheckLimit` : `physical × 9 / 10` se calcule avec `Mul64` puis `Div64`, comme pour `NextGCTarget`.
