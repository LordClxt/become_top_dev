## Hint 1
`TryReceive` : un `select` avec une case de réception et un `default` qui renvoie `0, false`.

## Hint 2
`WithTimeout` : une case `<-time.After(d)` à côté de la case de réception.

## Hint 3
`Join` : boucle `for a != nil || b != nil`, deux cases `v, ok := <-a` / `<-b` ; quand `ok` est faux, `a = nil` (ou `b = nil`) puis `continue`.
