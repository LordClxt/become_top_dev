Écris un tableau de scores partagé par beaucoup de goroutines : un RWMutex protège la map, les lectures se partagent le verrou, les écritures l'ont seul. `go test -race` doit rester silencieux.
