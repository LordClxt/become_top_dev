## Hint 1
`CountTo` : dans la goroutine, un `select` entre `ch <- i` et `<-ctx.Done()` ; `defer close(ch)`.

## Hint 2
`TimeLimit` : `out := make(chan T, 1)` (capacité 1 !). La goroutine y écrit, l'appelant fait un `select` entre `<-out` et `<-time.After(limit)`.

## Hint 3
`PressureGauge` : un `chan struct{}` de capacité `limit`. `Do` : `select { case g.tickets <- struct{}{}: defer func() { <-g.tickets }() ; f() ; return nil ; default: return ErrBusy }`.
