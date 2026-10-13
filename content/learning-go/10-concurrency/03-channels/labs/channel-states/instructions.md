## Contexte

Un channel a trois états qui changent son comportement : ouvert, **fermé** et **nil**. Envoyer sur un channel fermé ou le fermer deux fois provoque un `panic` ; lire un channel fermé ne bloque jamais. Tu écris des fonctions qui manipulent ces cas limites sans planter, puis tu te sers de la fermeture comme d'un signal de départ.

## Ta mission

Dans `states.go`, implémente :

### `SafeSend(ch chan int, v int) (sent bool)`

Envoie `v` sur `ch` et renvoie `true`. Si `ch` est fermé, l'envoi panique : `SafeSend` **rattrape** ce panic (avec `defer` et `recover`) et renvoie `false`. On suppose que `ch` a de la place ou qu'il est fermé : pas d'attente à gérer.

### `SafeClose(ch chan int) (closed bool)`

Ferme `ch` et renvoie `true`. Si `ch` est `nil` ou déjà fermé, `close` panique : `SafeClose` le rattrape et renvoie `false`.

Astuce : les valeurs de retour **nommées** (`sent`, `closed`) peuvent être modifiées dans la fonction différée.

### `Drain(ch <-chan int) []int`

Lit toutes les valeurs encore présentes dans le tampon d'un channel **déjà fermé**, dans l'ordre. Arrête-toi dès que le channel est fermé **et** vide, avec l'idiome `v, ok := <-ch` (pas de `range`). Un channel fermé et vide donne une slice vide **non nil**.

```go
ch := make(chan int, 3)
ch <- 1; ch <- 2
close(ch)
Drain(ch)   // [1 2]
```

### `StartTogether(n int, f func(i int)) (release func(), wait func())`

Lance `n` goroutines qui attendent toutes un signal avant d'appeler `f(i)` (i de 0 à n-1). Renvoie deux fonctions :
- `release()` donne le départ à **toutes en même temps**, en **fermant** un channel (pas en envoyant n valeurs) ;
- `wait()` bloque jusqu'à ce que les n appels de `f` soient terminés.

Aucun appel à `f` ne doit avoir lieu avant `release()`.

## Contraintes

- Les tests tournent avec le détecteur de courses (`-race`).
- Pas de `time.Sleep` pour « attendre que ça passe » : la synchronisation passe par les channels.
