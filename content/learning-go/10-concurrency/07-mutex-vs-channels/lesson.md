---
id: go-ch10-l07
title: Mutex ou channels ? Courses de données et pipelines
source:
  chapter: 12
  pages: 338-342
duration_min: 55
concepts:
- id: go-data-race
  label: 'Course de données : deux goroutines accèdent à la même variable sans synchronisation et l''une écrit ; le résultat est imprévisible
    ; go test -race la détecte'
- id: go-mutex
  label: 'sync.Mutex : Lock/Unlock protègent une section critique courte ; non réentrant, ne se copie pas, defer Unlock'
- id: go-rwmutex
  label: 'sync.RWMutex : plusieurs lecteurs OU un seul écrivain ; utile quand les lectures dominent'
- id: go-share-by-communicating
  label: '« Ne communique pas en partageant la mémoire, partage la mémoire en communiquant » : transmettre la propriété des données par channel'
- id: go-channels-vs-mutex
  label: Channels pour transmettre des données et coordonner ; mutex pour protéger un état partagé (cache, compteur, structure)
- id: go-pipeline
  label: 'Pipeline : étapes reliées par des channels, avec fan-out (plusieurs workers) et fan-in (fusion), délais et annulation'
- id: go-atomic
  label: 'sync/atomic : opérations atomiques sur un entier ou un booléen, pour les cas simples et performants (usage avancé)'
glossary:
- term: course de données (data race)
  definition: Accès concurrents à la même variable, dont au moins une écriture, sans synchronisation.
- term: section critique
  definition: Portion de code qui ne doit être exécutée que par une goroutine à la fois.
- term: RWMutex
  definition: Verrou à lecteurs multiples ou écrivain unique.
- term: fan-out / fan-in
  definition: Répartir un flux entre plusieurs workers, puis fusionner leurs résultats en un seul flux.
- term: opération atomique
  definition: 'Opération indivisible sur une variable : aucune autre goroutine n''en voit un état intermédiaire.'
visuals:
- go-ch10-race-and-mutex
- go-ch10-pipeline-fanout-fanin
labs:
- go-ch10-l07-lab-scoreboard
- go-ch10-l07-lab-gather-process
xp: 55
---

## Pourquoi c'est important

Les channels ne sont pas le seul outil de Go. Parfois, plusieurs goroutines doivent **partager un état** (un cache, un compteur, un tableau de scores) et passer par un channel serait lourd. Savoir **quand utiliser un mutex et quand utiliser un channel** est ce qui distingue un code idiomatique d'un code laborieux, et savoir reconnaître une **course de données** évite des bugs qui n'apparaissent qu'en production.

## La course de données

Une **course de données** apparaît quand deux goroutines accèdent à la **même variable**, que l'une au moins **écrit**, et qu'aucune synchronisation ne les ordonne. `counter++` ressemble à une instruction atomique, mais c'est **lire, ajouter 1, écrire** : si deux goroutines lisent la même valeur avant que l'une écrive, une mise à jour est perdue.

::visual{id="go-ch10-race-and-mutex"}

Le résultat est imprévisible : parfois juste, parfois faux, sans erreur ni plantage. Heureusement Go fournit le **détecteur de courses** : `go test -race ./...` (ou `go run -race`) instrumente le programme et signale les accès concurrents non synchronisés. **Lance toujours tes tests concurrents avec `-race`.**

## Le mutex

Un `sync.Mutex` garantit qu'**une seule goroutine à la fois** exécute la section qu'il protège :

```go
type Counter struct {
    mu sync.Mutex
    n  int
}

func (c *Counter) Inc() {
    c.mu.Lock()
    defer c.mu.Unlock()     // libère même en cas de retour anticipé ou de panic
    c.n++
}
```

Règles d'usage :

- garde la **section critique courte** : tout ce qui est sous le verrou fait attendre les autres ;
- **`defer mu.Unlock()`** juste après `Lock()` ;
- un `Mutex` **n'est pas réentrant** : verrouiller deux fois dans la même goroutine bloque pour toujours ;
- **ne copie jamais** une struct qui contient un mutex (utilise des méthodes à receveur pointeur) ; `go vet` le signale ;
- place le mutex **à côté des données qu'il protège**, dans la même struct, et ne l'expose pas.

### RWMutex

Quand les **lectures dominent** largement, un `sync.RWMutex` permet **plusieurs lecteurs en même temps** (`RLock`/`RUnlock`) ou **un seul écrivain** (`Lock`/`Unlock`) : un cache, une table de configuration, un tableau de scores consultés bien plus souvent qu'ils ne sont modifiés. Si les écritures sont fréquentes, un simple `Mutex` est plus simple et souvent aussi rapide.

## Mutex ou channel ?

Le slogan de Go : *« Ne communique pas en partageant la mémoire ; partage la mémoire en communiquant. »* Autrement dit, quand c'est naturel, **transmets la donnée** (et avec elle la responsabilité de s'en occuper) par un channel plutôt que de laisser plusieurs goroutines la modifier.

Un guide de décision :

| Situation | Outil |
|---|---|
| Passer des données d'une goroutine à une autre, répartir du travail, livrer des résultats | **channel** |
| Coordonner des étapes d'un flux (pipeline), signaler une fin ou une annulation | **channel** (ou `context`) |
| Protéger un état partagé consulté et modifié par plusieurs goroutines (cache, compteur, structure) | **mutex** |
| Lectures très fréquentes, écritures rares | **RWMutex** |
| Un compteur ou un drapeau ultra-simple, chemin très chaud | **atomique** (avancé) |

Un exemple instructif : un tableau de scores. On peut le protéger avec un `RWMutex`, ou le confier à **une seule goroutine** qui reçoit des demandes par channel. Les deux fonctionnent ; le mutex est plus court et plus direct pour un simple état partagé. Choisis ce qui rend le code le plus clair, et garde la synchronisation **cachée** dans le type.

> Au-delà du livre : `sync/atomic` offre des types (`atomic.Int64`, `atomic.Bool`) dont les opérations (`Add`, `Load`, `Store`, `CompareAndSwap`) sont indivisibles. C'est plus rapide qu'un mutex pour un simple compteur, mais difficile à utiliser correctement dès que deux variables doivent changer ensemble. Commence par un mutex ; passe aux atomiques sur preuve de mesure. `sync.Map` existe aussi, mais pour des cas rares (clés écrites une fois et lues souvent, ou ensembles de clés disjoints entre goroutines) : une map ordinaire sous mutex est généralement préférable.

## Assembler : le pipeline

Les outils des leçons précédentes se combinent en **pipeline** : des étapes reliées par des channels. On **répartit** le travail d'une étape entre plusieurs workers (*fan-out*), puis on **fusionne** leurs sorties (*fan-in*) avec un moniteur de fermeture. Les résultats sortent dans l'**ordre de fin**, pas dans l'ordre d'entrée.

::visual{id="go-ch10-pipeline-fanout-fanin"}

Un exemple typique : pour répondre à une requête, on interroge en parallèle deux services A et B (avec un délai global), on **annule l'un dès que l'autre échoue**, puis une troisième étape C combine les deux résultats. Tout est piloté par un `context` annulable : s'il expire, chaque étape voit `ctx.Done()` et s'arrête, sans fuite.

## Pièges fréquents

- **Une course de données « qui marche en général »** : elle échouera au pire moment ; passe `-race`.
- **Verrouiller trop large** : une section critique qui fait de l'E/S bloque tout le monde.
- **Copier un Mutex** (struct passée par valeur) : chaque copie a son propre verrou.
- **Verrouiller deux fois** dans la même goroutine : deadlock (le mutex n'est pas réentrant).
- **Exposer le mutex** dans l'API : les appelants ne devraient pas avoir à connaître le verrou.
- **Utiliser des channels pour tout** : un mutex est parfois la solution la plus claire.

## À retenir

- `counter++` n'est pas atomique : une course de données perd des mises à jour sans erreur ; `go test -race` les détecte.
- Mutex : section critique courte, `defer Unlock`, non réentrant, jamais copié ; RWMutex si les lectures dominent.
- Channel pour transmettre des données et coordonner ; mutex pour protéger un état partagé.
- Pipeline : fan-out / fan-in, délai et annulation par `context`, résultats dans l'ordre de fin.
