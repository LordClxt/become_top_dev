## Hint 1
La file est un channel tamponné de capacité `capacity`. Un seul `sync.Mutex` protège la table des enregistrements, les compteurs et le drapeau `closed`.

## Hint 2
`Submit` ne bloque jamais : `select { case r.jobs <- j: ... default: ErrFull }`, le tout sous le mutex pour que le test de `closed` et l'envoi soient atomiques.

## Hint 3
`Shutdown` : sous le mutex, `closed = true` et `close(r.jobs)` **une seule fois** (garde-le derrière le drapeau). Les workers font `for j := range r.jobs` et s'arrêtent seuls une fois la file vidée.

## Hint 4
Donne aux jobs un contexte de Relay (`context.WithCancel`). Sur expiration du délai de `Shutdown`, appelle `cancel()` puis renvoie `ctx.Err()`.
