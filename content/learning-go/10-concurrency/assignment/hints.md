## Hint 1
Lance `workers` goroutines dans un `WaitGroup`. Chacune boucle sur un `select` entre `<-ctx.Done()` et la lecture de `in`.

## Hint 2
L'**envoi** du résultat doit lui aussi être un `select` avec `<-ctx.Done()` : sinon un worker reste bloqué si plus personne ne lit.

## Hint 3
Une goroutine moniteur fait `wg.Wait()` puis `close(out)`, une seule fois.
