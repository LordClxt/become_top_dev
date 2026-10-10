## Relay, c'est quoi ?

Relay est le projet fil rouge du cours : un petit service qui reçoit des **jobs** (envoyer un e-mail, redimensionner une image…) et les exécute. Tu le construis module après module. À la fin, ce sera un vrai service HTTP concurrent, testé et instrumenté.

Dans ce module, pas de réseau ni de concurrence : on pose le **modèle de données**.

## Le type Job (déjà dans `jobs.go`)

```go
type Job struct {
	ID       string
	Kind     string   // "email", "resize", ...
	Priority int      // plus grand = plus urgent
	Tags     []string
}
```

## Étape 1 — Indexer

```go
func Index(jobs []Job) (byID map[string]Job, duplicates []string)
```

- `byID` associe chaque ID à son job. En cas de doublon, **le premier job rencontré** est gardé.
- `duplicates` liste les IDs vus plus d'une fois, chacun **une seule fois**, dans l'ordre de leur première répétition. Slice de longueur 0 s'il n'y en a pas.

## Étape 2 — Regrouper par type

```go
func ByKind(jobs []Job) map[string][]Job
```

Chaque type est associé à ses jobs, **dans l'ordre d'arrivée**.

## Étape 3 — Préparer un lot

```go
func NextBatch(queue []Job, n int) (batch, rest []Job)
```

- `batch` : les `n` jobs de plus haute priorité (ou moins si la file est plus courte). À priorité égale, l'ordre d'arrivée est conservé.
- `rest` : tous les autres jobs, dans leur ordre d'arrivée d'origine.
- `n <= 0` : `batch` est vide, `rest` contient tout.
- `queue` ne doit pas être modifiée.
- **`batch` et `rest` ne doivent jamais partager de mémoire** : un `append` sur l'un ne doit pas modifier l'autre. Une revue de code est prévue à cette étape.
