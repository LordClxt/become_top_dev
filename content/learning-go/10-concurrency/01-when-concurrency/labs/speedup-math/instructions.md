## Contexte

Avant d'ajouter des goroutines, on chiffre ce qu'elles peuvent rapporter. La loi d'Amdahl le dit : si seule une fraction `p` du travail se parallélise, le reste plafonne le gain, quel que soit le nombre de cœurs. Tu écris les petites fonctions de calcul qui servent à trancher.

## Ta mission

Dans `speedup.go`, implémente quatre fonctions. Leurs commentaires répètent ces règles.

### `Speedup(p float64, n int) float64`

Le gain d'Amdahl pour une fraction parallélisable `p` (entre 0 et 1) sur `n` cœurs : `1 / ((1 - p) + p/n)`.

```go
Speedup(0.9, 4)   // ≈ 3.08
Speedup(0, 8)     // 1 : rien ne se parallélise
```

### `MaxSpeedup(p float64) float64`

Le plafond quand le nombre de cœurs tend vers l'infini : `1 / (1 - p)`. Pour `p == 1`, il n'y a pas de plafond : renvoie `math.Inf(1)`.

```go
MaxSpeedup(0.9)   // ≈ 10
```

### `CoresFor(p, target float64) (cores int, ok bool)`

Le plus petit nombre de cœurs qui atteint **au moins** le gain `target`.
- `target <= 1` : un cœur suffit, `(1, true)`.
- Si `MaxSpeedup(p) <= target`, c'est inatteignable : `(0, false)`.

```go
CoresFor(0.9, 5)  // (9, true)
CoresFor(0.5, 2)  // (0, false) : le plafond vaut exactement 2
```

### `Chunks(n, parts int) [][2]int`

Découpe `n` éléments en `parts` tranches contiguës `[début, fin)` de tailles presque égales. Quand la division ne tombe pas juste, ce sont les **premières** tranches qui reçoivent un élément de plus.
- `parts > n` : seulement `n` tranches, jamais de tranche vide.
- `n <= 0` ou `parts <= 0` : `nil`.

```go
Chunks(10, 3)     // [[0 4] [4 7] [7 10]]
Chunks(2, 5)      // [[0 1] [1 2]]
```

## Contraintes

- Pas de goroutine ici : c'est du calcul pur.
- Compare les flottants avec les valeurs exactes de la formule, sans arrondir toi-même.
