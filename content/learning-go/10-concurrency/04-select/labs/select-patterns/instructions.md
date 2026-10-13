## Contexte

`select` attend sur plusieurs channels à la fois et prend le premier prêt. Avec une branche `default` il ne bloque plus ; avec `time.After` il expire ; avec un channel `nil` une branche est désactivée. Tu assembles ces quatre motifs.

## Ta mission

Dans `patterns.go`, implémente :

### `TryReceive(ch <-chan int) (int, bool)`

Tente de lire **sans bloquer** : `(v, true)` si une valeur est prête, `(0, false)` sinon.

### `FirstOf(a, b <-chan int) int`

Renvoie la première valeur reçue sur `a` ou sur `b`, celle qui arrive en premier.

### `WithTimeout(ch <-chan int, d time.Duration) (int, error)`

Attend une valeur sur `ch` pendant au plus `d`.
- Une valeur arrive : `(v, nil)`.
- Rien après `d` : `(0, ErrTimeout)` (la variable est déjà déclarée dans le fichier).
- `ch` est fermé avant : `(0, nil)`.

### `Join(a, b <-chan int) []int`

Lit `a` et `b` en même temps jusqu'à ce que **les deux** soient fermés, et renvoie toutes les valeurs dans l'ordre d'arrivée. Quand un channel est fermé, mets ta variable locale à `nil` : une branche de `select` sur un channel `nil` n'est plus jamais choisie, ce qui évite de relire en boucle un channel fermé. Si les deux sont déjà fermés, renvoie une slice vide **non nil**.

```go
a, b := make(chan int), make(chan int)
// … une goroutine envoie 1 sur a, 2 sur b, puis ferme les deux
Join(a, b)   // [1 2] ou [2 1] selon l'ordre d'arrivée
```

## Contraintes

- Les tests tournent avec le détecteur de courses (`-race`).
- Aucune goroutine ne doit rester bloquée après le retour de tes fonctions.
