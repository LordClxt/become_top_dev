---
id: go-ch10-l05
title: 'Bonnes pratiques : API, fuites, tampons et délais'
source:
  chapter: 12
  pages: 331-335
duration_min: 50
concepts:
- id: go-api-no-concurrency
  label: 'La concurrence est un détail d''implémentation : une API publique n''expose ni channels ni mutex, sauf si c''est son but'
- id: go-goroutine-leak
  label: 'Fuite de goroutine : une goroutine bloquée pour toujours garde sa mémoire ; toute goroutine doit avoir une condition d''arrêt'
- id: go-context-cancel
  label: On arrête une goroutine par annulation (context ou channel done) lue dans un select
- id: go-buffer-choice
  label: 'Tampon : utile quand on connaît le nombre de goroutines ou qu''on veut borner la charge ; jamais pour masquer un blocage'
- id: go-backpressure
  label: 'Contre-pression : un channel tamponné comme jeu de jetons, avec select et default, refuse l''excédent au lieu de faire grossir une file'
- id: go-timeout-pattern
  label: 'Limiter la durée d''un travail : le travail s''exécute dans une goroutine qui écrit sur un channel de capacité 1, pour ne pas fuir si
    le délai a expiré'
glossary:
- term: fuite de goroutine
  definition: Goroutine qui ne se termine jamais, le plus souvent bloquée sur un channel que personne ne lira.
- term: contre-pression
  definition: Mécanisme qui ralentit ou refuse les producteurs quand le consommateur ne suit pas.
- term: annulation
  definition: Signal envoyé à une goroutine pour lui demander de s'arrêter, par exemple via ctx.Done().
- term: sémaphore
  definition: Compteur de jetons qui borne le nombre d'opérations simultanées.
visuals:
- go-ch10-goroutine-leak
- go-ch10-backpressure
labs:
- go-ch10-l05-lab-no-leaks
xp: 50
---

## Pourquoi c'est important

Les outils (goroutines, channels, select) sont simples ; les **erreurs** viennent de la façon de les assembler. Cette leçon rassemble les habitudes qui séparent un programme concurrent fiable d'un programme qui fuit, se bloque ou s'effondre sous la charge.

## Garde la concurrence hors de ton API

La concurrence est un **détail d'implémentation**. Une fonction publique qui expose des channels ou demande à l'appelant de prendre un mutex lui impose de connaître ses règles internes. Préfère une API **synchrone** qui renvoie un résultat, et gère la concurrence **à l'intérieur**.

```go
// Plutôt que : func Fetch(ids []int) <-chan Result   (l'appelant doit lire, fermer, gérer les erreurs)
func Fetch(ctx context.Context, ids []int) ([]Result, error)   // la concurrence reste cachée
```

Il y a des exceptions : une API dont le but **est** de livrer un flux (un abonnement, un générateur) renvoie un channel. Dans ce cas, documente qui ferme et comment on l'arrête.

## Nettoie toujours tes goroutines

Une goroutine qui ne se termine pas est une **fuite**. Elle garde sa pile et tout ce qu'elle référence, et le ramasse-miettes ne la collecte pas, car une goroutine bloquée est considérée comme vivante. Le cas typique : un générateur dont le consommateur s'arrête avant la fin.

::visual{id="go-ch10-goroutine-leak"}

**Règle** : chaque goroutine démarrée doit avoir une **condition d'arrêt claire**. Le moyen standard est un signal d'annulation lu dans un `select`, avec le package `context` (`ctx.Done()` est un channel fermé à l'annulation) :

```go
func countTo(ctx context.Context, max int) <-chan int {
    ch := make(chan int)
    go func() {
        defer close(ch)
        for i := 1; i <= max; i++ {
            select {
            case ch <- i:
            case <-ctx.Done():
                return              // le consommateur est parti : on s'arrête
            }
        }
    }()
    return ch
}
```

Le consommateur fait `ctx, cancel := context.WithCancel(...)` puis `defer cancel()` : où qu'il sorte de la boucle, le producteur est libéré. (Le package `context` est étudié en détail dans un module ultérieur ; ici seul `Done()` compte.) Tu peux vérifier l'absence de fuite dans un test avec `runtime.NumGoroutine()`.

## Tampon ou pas ?

Un tampon n'est pas un remède magique. Il a deux bons usages :

- **Le nombre de goroutines est connu** : tu lances 10 workers qui écriront chacun un résultat ; avec un tampon de 10, aucun n'attend le lecteur, aucun ne fuit s'il part trop tôt.
- **Tu veux borner la charge** : le tampon est un nombre de places, et le remplir est le signal de dire non.

Mauvais usage : ajouter un tampon pour faire disparaître un blocage dont on ne comprend pas la cause. Le blocage revient dès que le tampon est plein.

## La contre-pression

Un serveur qui accepte toutes les requêtes finit par s'effondrer : les files grandissent, la latence explose pour tout le monde. Mieux vaut **refuser tôt** ce qu'on ne peut pas traiter. Un channel tamponné sert de **jeu de jetons** (un sémaphore) : prendre un jeton, c'est envoyer dans le channel ; le rendre, c'est lire. Avec `select` et `default`, on **refuse sans attendre** quand il n'y a plus de place.

::visual{id="go-ch10-backpressure"}

C'est la structure d'un limiteur de charge : au-delà de N requêtes simultanées, on répond « 429, trop de requêtes » plutôt que de mettre en file.

## Limiter la durée d'un travail

Pour donner un délai maximal à une fonction lente, on la lance dans une goroutine et on attend le résultat **ou** le délai, avec `select`. Piège : si le délai expire d'abord, la goroutine finira plus tard et voudra **écrire son résultat** sur un channel que plus personne ne lit : elle resterait bloquée pour toujours. La parade : un channel de **capacité 1**. L'écriture réussit toujours sans lecteur, et la goroutine se termine.

```go
func timeLimit[T any](work func() T, limit time.Duration) (T, error) {
    out := make(chan T, 1)          // capacité 1 : la goroutine ne fuira pas
    go func() { out <- work() }()
    select {
    case v := <-out:
        return v, nil
    case <-time.After(limit):
        var zero T
        return zero, errors.New("délai dépassé")
    }
}
```

Note : le travail continue de s'exécuter en arrière-plan jusqu'à sa fin ; on n'a pas arrêté le calcul, seulement cessé de l'attendre. Pour l'interrompre vraiment, le travail doit lui-même observer un `ctx`.

## Pièges fréquents

- **Une API qui impose à l'appelant de gérer des channels** sans raison.
- **Une goroutine sans issue** : générateur abandonné, `select` sans case de sortie.
- **Un tampon « pour que ça passe »** : le problème est seulement repoussé.
- **Un channel de délai sans tampon** : la goroutine de travail fuit si le délai expire.
- **File d'attente non bornée** : la mémoire et la latence explosent sous charge.

## À retenir

- Cache la concurrence derrière une API synchrone quand c'est possible.
- Toute goroutine a une condition d'arrêt ; l'annulation se lit dans un `select` (`ctx.Done()`).
- Tampon : nombre de goroutines connu ou charge bornée, jamais un pansement.
- Contre-pression : jetons dans un channel tamponné, `select` + `default` pour refuser.
- Délai : channel de résultat de capacité 1 pour ne pas fuir.
