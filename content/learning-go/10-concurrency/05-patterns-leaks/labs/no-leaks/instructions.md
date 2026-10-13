## Contexte

Une goroutine bloquée pour toujours sur un envoi que personne ne lira est une **fuite** : elle garde sa mémoire jusqu'à la fin du programme. Tu écris trois outils qui ne laissent jamais de goroutine derrière eux.

## Ta mission

Dans `noleaks.go`, implémente :

### `CountTo(ctx context.Context, max int) <-chan int`

Renvoie un channel qui livre `1, 2, …, max` puis se ferme. Si `ctx` est annulé avant la fin, la goroutine productrice s'arrête et ferme le channel. Elle ne doit **jamais** rester bloquée sur un envoi : chaque envoi se fait dans un `select` qui écoute aussi `ctx.Done()`.

```go
ctx, cancel := context.WithCancel(context.Background())
for v := range CountTo(ctx, 100) {
    if v == 3 { cancel(); break }   // la goroutine productrice s'arrête aussi
}
```

### `TimeLimit[T any](work func() T, limit time.Duration) (T, error)`

Exécute `work` dans une goroutine et renvoie son résultat, ou `(valeur zéro, ErrTimeout)` si `limit` est dépassé. Piège : si tu abandonnes l'attente, la goroutine de travail essaiera quand même d'envoyer son résultat. Donne-lui un channel **tamponné d'une place** pour qu'elle puisse toujours terminer.

### `PressureGauge`, `NewPressureGauge(limit int)` et `Do(f func()) error`

Un limiteur de charge : au plus `limit` appels de `Do` en même temps.
- Un jeton libre : `Do` exécute `f` puis rend le jeton, **même si `f` panique** (utilise `defer`), et renvoie `nil`.
- Plus de jeton : `Do` ne bloque **pas** et renvoie tout de suite `ErrBusy` sans exécuter `f`.

Indice de conception : un channel tamponné de taille `limit` sert de jeu de jetons.

## Contraintes

- Un test compte les goroutines encore en vie après chaque appel : il doit revenir au nombre de départ.
- Les tests tournent avec le détecteur de courses (`-race`).
