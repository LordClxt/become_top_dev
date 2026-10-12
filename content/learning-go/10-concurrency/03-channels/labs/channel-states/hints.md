## Hint 1
`SafeSend` et `SafeClose` : un `defer func() { if recover() != nil { ... } }()` qui modifie la valeur de retour nommée.

## Hint 2
`Drain` : `v, ok := <-ch` dans une boucle ; quand `ok` est faux, renvoie ce que tu as accumulé.

## Hint 3
`StartTogether` : crée `start := make(chan struct{})` ; chaque goroutine fait `<-start` avant `f(i)`. `release` est `close(start)` : une fermeture réveille tous les lecteurs. Pour `wait`, compte les fins avec un `sync.WaitGroup` (ou un channel).
