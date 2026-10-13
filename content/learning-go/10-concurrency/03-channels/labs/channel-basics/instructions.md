## Contexte

Un channel relie une goroutine qui produit à une goroutine qui consomme. Tu construis un petit flux complet (produire, transformer, consommer), puis un échange ping-pong qui montre qu'un channel **sans tampon** synchronise les deux côtés.

## Ta mission

Dans `channels.go`, implémente :

### `Generate(nums ...int) <-chan int`

Renvoie un channel **en lecture seule** qui livre les valeurs de `nums` dans l'ordre, puis **se ferme**. C'est une goroutine lancée par `Generate` qui écrit ; elle se termine une fois toutes les valeurs lues.

### `Collect(ch <-chan int) []int`

Lit `ch` jusqu'à sa fermeture et renvoie les valeurs reçues, dans l'ordre. Un channel fermé d'emblée donne une slice vide.

```go
Collect(Generate(1, 2, 3))   // [1 2 3]
```

### `Map(in <-chan int, f func(int) int) <-chan int`

Renvoie un channel qui livre `f(v)` pour chaque `v` lu sur `in`, dans l'ordre, et **se ferme quand `in` est fermé**. Une fois `in` épuisé et la sortie lue en entier, aucune goroutine ne doit rester bloquée.

```go
Collect(Map(Generate(1, 2, 3), func(v int) int { return v * 10 }))   // [10 20 30]
```

### `PingPong(n int) []string`

Deux goroutines échangent `n` fois sur deux channels **sans tampon** : la première envoie `"ping i"`, la seconde répond `"pong i"` (i de 1 à n). Renvoie le journal dans l'ordre exact.

```go
PingPong(2)   // ["ping 1" "pong 1" "ping 2" "pong 2"]
PingPong(0)   // []
```

## Contraintes

- Celui qui **écrit** dans un channel est celui qui le **ferme**, jamais celui qui lit.
- Un test vérifie qu'aucune goroutine ne reste en vie après coup : chaque goroutine lancée doit pouvoir se terminer.
- Les tests tournent avec le détecteur de courses (`-race`).
