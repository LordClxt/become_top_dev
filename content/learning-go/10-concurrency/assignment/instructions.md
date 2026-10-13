## Contexte

Le *worker pool* est le motif de concurrence le plus courant en production : un nombre fixe de goroutines se partagent un flux de tâches. La difficulté n'est pas de le faire marcher, c'est de le faire **s'arrêter proprement** : quand le contexte est annulé, ou quand l'appelant cesse de lire, aucune goroutine ne doit rester bloquée.

## Ta mission

Dans `pool.go`, implémente :

```go
func ProcessAll(ctx context.Context, in <-chan int, workers int,
    f func(context.Context, int) (int, error)) <-chan Result
```

`Result` est déjà déclaré : `{In, Out int; Err error}`.

- Lis les entiers de `in` et applique `f` à chacun avec **au plus `workers`** goroutines en même temps (`workers <= 0` compte comme 1).
- Chaque entrée produit **exactement un** `Result` sur le channel renvoyé, dans l'ordre de fin (pas dans l'ordre d'entrée).
- Une erreur de `f` va dans `Result.Err` : elle n'arrête pas le traitement des autres entrées.
- Le channel de sortie est fermé **une seule fois**, quand tous les workers ont terminé.
- Quand `ctx` est annulé, les workers cessent de prendre de nouvelles entrées, et l'envoi d'un résultat ne bloque jamais : même si l'appelant ne lit plus, aucune goroutine ne reste bloquée.

```go
in := make(chan int)
go func() { for i := 1; i <= 3; i++ { in <- i }; close(in) }()
for r := range ProcessAll(ctx, in, 2, func(_ context.Context, v int) (int, error) { return v * v, nil }) {
    fmt.Println(r.In, r.Out)   // 1 1, 2 4, 3 9 dans un ordre quelconque
}
```

## Ce qui sera noté

- **Tests (50 %)**, avec le détecteur de courses (`-race`).
- **Relecture (50 %)** : arrêt propre et absence de fuite (chaque lecture et chaque envoi gardés par `ctx.Done()`, fermeture unique par un moniteur), choix de conception, lisibilité. La grille complète est affichée sous l'énoncé.
