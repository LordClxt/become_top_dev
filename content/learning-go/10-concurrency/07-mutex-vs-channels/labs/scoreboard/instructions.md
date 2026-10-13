## Contexte

Quand beaucoup de goroutines lisent et modifient le **même état**, un mutex est souvent plus simple qu'un channel. Ici les lectures sont fréquentes et les écritures plus rares : c'est le cas d'usage de `sync.RWMutex`, où plusieurs lecteurs partagent le verrou et un écrivain l'a pour lui seul.

## Ta mission

Dans `scoreboard.go`, complète le type `Scoreboard` (une `map[string]int` protégée par un `sync.RWMutex`) et ses méthodes :

| Méthode | Rôle | Verrou |
|---|---|---|
| `NewScoreboard() *Scoreboard` | crée un tableau vide, prêt à l'emploi | aucun |
| `Add(name string, points int) int` | ajoute `points` au score de `name` (créé à 0 s'il n'existe pas) et renvoie le nouveau score | écriture (`Lock`) |
| `Get(name string) (int, bool)` | renvoie le score et si le nom existe | lecture (`RLock`) |
| `Top() (name string, points int, ok bool)` | le meilleur score ; à égalité, le premier nom dans l'ordre alphabétique ; `ok` faux si le tableau est vide | lecture |
| `Snapshot() map[string]int` | une **copie** des scores : la modifier ne change pas le tableau | lecture |

```go
s := NewScoreboard()
s.Add("ada", 3)
s.Add("bob", 3)
s.Top()   // ("ada", 3, true) : égalité, ordre alphabétique
```

## Contraintes

- Le mutex ne doit jamais être copié : les méthodes ont un receveur pointeur.
- `Snapshot` ne renvoie jamais la map interne elle-même.
- Les tests lancent vingt goroutines qui lisent et écrivent en même temps, avec le détecteur de courses (`-race`) : il doit rester silencieux.
