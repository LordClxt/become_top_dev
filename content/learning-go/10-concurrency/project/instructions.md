## Contexte

**Relay** est un petit exécuteur de tâches : il accepte des jobs, en exécute plusieurs à la fois avec un nombre borné de workers, **refuse** ce qu'il ne peut pas absorber au lieu de bloquer, et s'arrête proprement. C'est le cœur de n'importe quel serveur qui traite des requêtes en arrière-plan.

Tout se passe dans `relay.go`. Les types (`Job`, `Status`, `Stats`) et les erreurs (`ErrFull`, `ErrClosed`, `ErrDuplicate`) sont déjà déclarés ; tu complètes la struct `Relay` et ses méthodes. Les tests de chaque étape sont préfixés `TestM1`, `TestM2`, `TestM3` dans les résultats : avance étape par étape, les tests des étapes suivantes peuvent échouer en attendant.

## Étape 1 : des workers qui travaillent

- `New(workers, capacity int) *Relay` démarre `workers` goroutines (au moins 1) qui consomment une file de `capacity` jobs (au moins 1).
- `Submit(j Job) error` met le job en file et renvoie `nil`. Il ne bloque **jamais**.
- Un job passe par `Queued` → `Running` → `Done` (si `Run` renvoie `nil`) ou `Failed` (si `Run` renvoie une erreur).
- `Result(id string) (status Status, err error, ok bool)` renvoie l'état d'un job et son erreur (non nil seulement pour `Failed`). `ok` est faux pour un identifiant inconnu.

## Étape 2 : dire non plutôt qu'attendre

- `Submit` renvoie tout de suite `ErrFull` quand la file est pleine, et `ErrDuplicate` pour un identifiant déjà accepté.
- `Stats()` renvoie les compteurs : `Submitted` (acceptés), `Rejected` (refusés pour `ErrFull`), `Completed`, `Failed`, `InFlight` (en cours). Ils doivent rester exacts quand beaucoup de goroutines soumettent en même temps.

## Étape 3 : s'arrêter proprement

`Shutdown(ctx context.Context) error` :
- refuse désormais tout nouveau job (`Submit` renvoie `ErrClosed`) ;
- laisse finir les jobs en file et en cours, puis renvoie `nil` ;
- si `ctx` expire avant, annule le contexte passé aux jobs en cours et renvoie `ctx.Err()` sans attendre davantage ;
- peut être appelé plusieurs fois, et depuis plusieurs goroutines, sans paniquer.

Les tests tournent avec le détecteur de courses (`-race`).
