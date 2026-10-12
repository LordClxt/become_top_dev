---
id: go-ch10-l06
title: WaitGroup, fermeture unique et sync.Once
source:
  chapter: 12
  pages: 335-338
duration_min: 45
concepts:
- id: go-waitgroup
  label: 'sync.WaitGroup attend la fin d''un groupe de goroutines : Add avant de lancer, Done (avec defer) à la fin, Wait pour attendre'
- id: go-wg-pitfalls
  label: 'Pièges du WaitGroup : Add dans la goroutine, copie du WaitGroup (passer un pointeur ou capturer), compteur négatif'
- id: go-close-monitor
  label: 'Plusieurs écrivains, une seule fermeture : une goroutine moniteur fait wg.Wait() puis close(ch)'
- id: go-errgroup
  label: 'errgroup (golang.org/x/sync) : un WaitGroup qui collecte la première erreur et peut annuler le groupe'
- id: go-once
  label: 'sync.Once, OnceFunc, OnceValue : initialisation paresseuse exécutée exactement une fois, sûre en concurrence'
glossary:
- term: sync.WaitGroup
  definition: 'Compteur de goroutines en cours : Add l''incrémente, Done le décrémente, Wait bloque jusqu''à zéro.'
- term: goroutine moniteur
  definition: Goroutine dont le seul rôle est d'attendre un groupe puis de fermer un channel.
- term: sync.Once
  definition: Garantit qu'une fonction n'est exécutée qu'une fois, même appelée par plusieurs goroutines.
- term: initialisation paresseuse
  definition: Création d'une ressource coûteuse au premier usage plutôt qu'au démarrage.
visuals:
- go-ch10-waitgroup-close-monitor
labs:
- go-ch10-l06-lab-waitgroup-patterns
xp: 45
---

## Pourquoi c'est important

Lancer des goroutines est facile ; savoir **quand elles ont toutes fini** l'est moins. Et quand plusieurs goroutines écrivent dans le même channel, **qui le ferme ?** Cette leçon donne les outils standard : `sync.WaitGroup`, le moniteur de fermeture, et `sync.Once` pour l'initialisation unique.

## Attendre un groupe avec `sync.WaitGroup`

Un `WaitGroup` est un **compteur** de goroutines en cours :

```go
var wg sync.WaitGroup
for _, id := range ids {
    wg.Add(1)                 // avant de lancer
    go func() {
        defer wg.Done()       // à la fin, quoi qu'il arrive
        process(id)
    }()
}
wg.Wait()                     // bloque jusqu'à ce que le compteur retombe à 0
```

Trois règles :

1. **`Add` avant le `go`**, dans la goroutine appelante, jamais dans la goroutine lancée (sinon `Wait` peut passer avant que `Add` ait eu lieu).
2. **`Done` avec `defer`**, pour qu'un retour anticipé ou un panic ne laisse pas le compteur bloqué.
3. **Ne copie jamais un `WaitGroup`** : une copie a son propre compteur et `Wait` ne se débloquerait jamais. Capture-le dans une fermeture ou passe un **pointeur**. `go vet` signale la copie.

Un compteur qui devient négatif (trop de `Done`) provoque un panic.

## Plusieurs écrivains, une seule fermeture

Un channel doit être fermé **une seule fois**, par celui qui écrit. Mais si trois goroutines écrivent dans `out`, aucune ne peut le fermer en sortant : les autres écriraient sur un channel fermé (panic). La solution classique est une **goroutine moniteur** :

```go
go func() {
    wg.Wait()      // attend que TOUS les écrivains aient terminé
    close(out)     // ferme une seule fois
}()
for v := range out { use(v) }   // se termine tout seul à la fermeture
```

::visual{id="go-ch10-waitgroup-close-monitor"}

C'est le cœur de la **fusion** de plusieurs flux en un seul (*fan-in*). Le moniteur est la seule goroutine qui ferme, donc aucun risque de double fermeture.

## errgroup : un WaitGroup qui gère les erreurs

`WaitGroup` ne sait pas rapporter une erreur. Le package `golang.org/x/sync/errgroup` (hors bibliothèque standard) y ajoute : `g.Go(func() error {...})` lance une goroutine, `g.Wait()` attend et renvoie la **première erreur**, et `errgroup.WithContext` annule un contexte dès la première erreur pour arrêter les autres. À connaître : c'est la façon courante de lancer N appels en parallèle et d'abandonner dès que l'un échoue. Sans dépendance externe, on écrit la même chose avec un `WaitGroup` et un channel d'erreurs.

## Initialiser une seule fois : `sync.Once`

Certaines ressources coûteuses (lecture d'un fichier de configuration, construction d'une table) doivent être créées **à la demande, une seule fois**, même si plusieurs goroutines la demandent au même moment :

```go
var once sync.Once
func config() *Config {
    once.Do(func() { cfg = load() })   // load() n'est appelée qu'une fois
    return cfg
}
```

Les autres appelants **attendent** la fin de la première exécution. Depuis Go 1.21, trois raccourcis existent :

- `sync.OnceFunc(f)` renvoie une fonction qui n'appelle `f` qu'une fois ;
- `sync.OnceValue(f)` renvoie une fonction qui calcule une valeur une fois, puis la renvoie à chaque appel ;
- `sync.OnceValues(f)` fait de même pour deux valeurs (typiquement un résultat et une erreur).

```go
roots := sync.OnceValue(func() map[int]float64 { return buildTable() })
table := roots()    // premier appel : construit ; les suivants : renvoient la même table
```

## Pièges fréquents

- **`wg.Add` dans la goroutine** : `Wait` peut rendre la main trop tôt.
- **Oublier `Done`** (ou ne pas le mettre en `defer`) : `Wait` bloque pour toujours.
- **Copier un `WaitGroup`** (paramètre par valeur) : le compteur de la copie n'est jamais décrémenté.
- **Fermer depuis un des écrivains** : panic « send on closed channel » chez les autres.
- **Croire que `sync.Once` se réinitialise** : une fois exécuté, il ne le sera plus jamais ; pour réessayer après une erreur, il faut une autre technique.

## À retenir

- `WaitGroup` : `Add` avant `go`, `defer Done`, `Wait` ; ne se copie pas.
- Plusieurs écrivains : un moniteur `wg.Wait(); close(out)` ferme une seule fois.
- `errgroup` ajoute la première erreur et l'annulation (hors stdlib).
- `sync.Once` / `OnceFunc` / `OnceValue` : initialisation unique, sûre en concurrence.
