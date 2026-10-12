## Hint 1
La struct contient `mu sync.RWMutex` et `scores map[string]int`. Initialise la map dans `NewScoreboard` : une map nil panique à l'écriture.

## Hint 2
`Add` écrit : `Lock` / `defer Unlock`. `Get`, `Top`, `Snapshot` lisent : `RLock` / `defer RUnlock`.

## Hint 3
`Top` : parcours la map en gardant le meilleur ; à égalité de points, garde le nom le plus petit (`name < best`).

## Hint 4
`Snapshot` : copie la map dans une nouvelle map sous le verrou de lecture.
