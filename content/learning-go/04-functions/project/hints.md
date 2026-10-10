## Hint 1
Le registre est une map : `Register` teste d'abord les cas d'erreur (nom vide, job nil, doublon avec `if _, exists := registry[name]; exists`). `Names` : `slices.Sorted(maps.Keys(registry))`. Un décorateur est une fonction qui prend un `Job` et renvoie un `Job` : écris d'abord la forme générale `func(next Job) Job { return func(args []string) (string, error) { … } }`.

## Hint 2
`WithDefaults` : fais une copie de `defaults` à la création (`slices.Clone`) et construis, à chaque appel, une slice neuve avec `make` puis deux `append`. Pour `Decorate`, boucle de la fin vers le début : le dernier décorateur enveloppe d'abord le job, le premier l'enveloppe en dernier (il est donc le plus extérieur).

## Hint 3
`Pipe` : `Run(registry, step.Job, args...)` fait déjà le travail. Avant d'ajouter la sortie précédente à `step.Args`, clone `step.Args` : `append` sur une slice qui a de la capacité libre écrirait dans le tableau de l'appelant. Pour garder `errors.Is`, enveloppe avec `fmt.Errorf("étape %d (%s) : %w", i+1, step.Job, err)`.
