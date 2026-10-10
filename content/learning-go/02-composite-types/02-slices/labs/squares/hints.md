## Hint 1
Tu connais la taille finale avant de commencer : c'est `len(nums)`. Profites-en.

## Hint 2
`make([]int, 0, len(nums))` réserve la place, puis `append` remplit sans jamais réallouer. `make([]int, len(nums))` puis `out[i] = …` fonctionne aussi.

## Hint 3
Une boucle `for _, n := range nums { out = append(out, n*n) }` sur une slice créée avec `make([]int, 0, len(nums))`.
