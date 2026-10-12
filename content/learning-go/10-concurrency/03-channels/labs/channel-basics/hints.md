## Hint 1
`Generate` : crée `out := make(chan int)`, lance une goroutine qui envoie chaque valeur puis fait `close(out)` (avec `defer`), et renvoie `out`.

## Hint 2
`Collect` : `for v := range ch` s'arrête tout seul à la fermeture. Pars de `got := []int{}` pour renvoyer une slice vide non nil.

## Hint 3
`Map` : même schéma que `Generate`, mais la goroutine lit `in` avec `range` et envoie `f(v)`.

## Hint 4
`PingPong` : une goroutine lit `ping` avec `range`, répond sur `pong` ; l'appelant envoie, lit la réponse, puis ferme `ping` à la fin pour que la goroutine se termine.
