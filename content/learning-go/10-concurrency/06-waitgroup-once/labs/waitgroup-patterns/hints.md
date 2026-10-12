## Hint 1
`Merge` : `wg.Add(len(chs))`, une goroutine par entrée qui recopie vers `out` puis `defer wg.Done()`, et une dernière goroutine : `wg.Wait(); close(out)`.

## Hint 2
`ProcessAll` : envoie les **indices** sur un channel `jobs` ; `workers` goroutines lisent `jobs` et écrivent `out[i]` (chacune sa case). Ferme `jobs` puis `wg.Wait()`.

## Hint 3
`RunAllErr` : un tableau `errs` de la taille des fonctions, chaque goroutine écrit `errs[i]` ; après `wg.Wait()`, renvoie la première erreur non nil.

## Hint 4
`Lazy` : capture `once sync.Once` et `value T` dans la fermeture ; `once.Do(func() { value = build() })`.
