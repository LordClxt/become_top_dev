## Contexte

Un service appelle souvent deux sources en parallèle, combine leurs réponses, puis fait une dernière étape, le tout sous un délai global. Si une source échoue, inutile d'attendre l'autre : on l'**annule**. Tu écris ce petit pipeline avec `context`.

## Ta mission

Dans `gather.go`, implémente :

### `Gather(ctx, fa, fb) (a, b int, err error)`

```go
func Gather(ctx context.Context, fa, fb func(context.Context) (int, error)) (a, b int, err error)
```

- Lance `fa` et `fb` en parallèle, chacune avec un contexte **dérivé** de `ctx` (`context.WithCancel`).
- Attends **les deux**, puis renvoie leurs résultats.
- Si l'une échoue, annule le contexte de l'autre pour qu'elle s'arrête vite, et renvoie la **première erreur survenue** dans le temps.
- `Gather` ne rend la main qu'après la fin des deux goroutines.

### `GatherAndProcess(ctx, limit, fa, fb, fc) (int, error)`

```go
func GatherAndProcess(ctx context.Context, limit time.Duration,
    fa, fb func(context.Context) (int, error),
    fc func(context.Context, int, int) (int, error)) (int, error)
```

1. Pose un délai global `limit` sur tout le traitement (`context.WithTimeout`).
2. Appelle `Gather(ctx, fa, fb)`.
3. Si tout va bien, appelle `fc(ctx, a, b)` et renvoie son résultat.

Si le délai expire, ou si `ctx` est annulé, avant la fin, renvoie l'erreur du contexte : `context.DeadlineExceeded` ou `context.Canceled` (les tests utilisent `errors.Is`).

## Contraintes

- Aucune goroutine ne doit fuir, même quand une fonction échoue ou que le délai expire.
- Pense à appeler la fonction `cancel` de chaque contexte dérivé (`defer cancel()`).
- Les tests tournent avec le détecteur de courses (`-race`).
