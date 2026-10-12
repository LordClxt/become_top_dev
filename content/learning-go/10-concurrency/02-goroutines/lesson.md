---
id: go-ch10-l02
title: Les goroutines et le planificateur de Go
source:
  chapter: 12
  pages: 316-321
duration_min: 40
concepts:
- id: go-goroutines
  label: Une goroutine est une fonction exécutée de façon concurrente, gérée par le runtime Go, bien moins coûteuse qu'un thread système
- id: go-go-keyword
  label: Le mot-clé go lance l'appel dans une nouvelle goroutine ; l'appelant n'attend pas, les valeurs de retour sont ignorées
- id: go-scheduler-mpg
  label: Le planificateur répartit des goroutines (G) sur des threads (M) via des processeurs logiques (P), avec vol de travail
- id: go-goroutine-closure
  label: On lance une goroutine avec une fonction anonyme qui enveloppe la logique métier ; elle capture ou reçoit ses paramètres
- id: go-main-exit
  label: 'Quand main se termine, le programme s''arrête : les goroutines encore en cours sont abandonnées'
glossary:
- term: goroutine
  definition: Fonction exécutée de façon concurrente, planifiée par le runtime de Go plutôt que par le système d'exploitation.
- term: G, M, P
  definition: 'Goroutine (G), thread système (M) et processeur logique (P) : le P porte la file de goroutines prêtes et prête un M pour les exécuter.'
- term: vol de travail
  definition: Un P inactif prend une partie de la file d'un autre P pour garder tous les threads occupés.
- term: GOMAXPROCS
  definition: Nombre de P, donc de goroutines exécutées réellement en parallèle ; par défaut le nombre de cœurs.
visuals:
- go-ch10-goroutine-scheduler
labs:
- go-ch10-l02-lab-goroutine-basics
xp: 40
---

## Pourquoi c'est important

Les goroutines sont l'idée qui rend Go agréable pour les serveurs : on en lance des milliers sans y penser. Pour s'en servir sans surprise, il faut comprendre **ce qu'elle sont** (et ne sont pas) et **comment le runtime les fait tourner**.

## Processus, thread, goroutine

- Un **processus** est un programme en cours d'exécution, avec sa mémoire propre.
- Un processus contient un ou plusieurs **threads** : des unités d'exécution du système d'exploitation, qui partagent la mémoire du processus. L'OS décide quand chacun tourne sur un cœur.
- Une **goroutine** est une unité d'exécution gérée par le **runtime de Go**, pas par l'OS. Plusieurs goroutines tournent au-dessus d'un petit nombre de threads.

Pourquoi c'est plus léger qu'un thread ? Une goroutine démarre avec une **petite pile** qui grandit à la demande (quelques kilo-octets, contre de l'ordre du mégaoctet pour un thread), sa **création** est très rapide, et le **changement de contexte** entre goroutines se fait dans le runtime, sans passer par le noyau. Résultat : lancer 100 000 goroutines est réaliste ; lancer 100 000 threads ne l'est pas.

## Lancer une goroutine : `go`

Il suffit de faire précéder un appel de fonction du mot-clé `go` :

```go
go fetchPrices(ids)   // l'appelant continue tout de suite
```

L'appel retourne immédiatement ; la fonction s'exécute à côté. Ses **valeurs de retour sont perdues** : pour récupérer un résultat, il faudra un channel (leçon suivante). Et `main` est lui-même une goroutine : **quand `main` se termine, le programme s'arrête**, même si d'autres goroutines n'ont pas fini.

### Envelopper la logique dans une fonction anonyme

Go n'a pas de « fonctions colorées » (async/await) : la fonction que tu lances est une fonction normale, et c'est à l'appelant de décider si elle tourne dans une goroutine. L'idiome est donc une **fonction anonyme** qui enveloppe l'appel :

```go
go func() {
    result := compute(input)
    results <- result
}()
```

Garde la **logique métier** dans des fonctions ordinaires, testables sans concurrence ; la goroutine n'est que la colle autour.

### Les paramètres

Une fonction anonyme lancée avec `go` peut **capturer** des variables de son contexte, mais depuis Go 1.22 chaque itération d'une boucle `for` a **sa propre copie** de la variable de boucle : le piège classique (toutes les goroutines voient la dernière valeur) a disparu pour le code récent. Dans du code plus ancien, on passait la valeur en paramètre : `go func(v int) { ... }(v)`. Passer en paramètre reste la façon la plus lisible de montrer ce que la goroutine utilise.

## Le planificateur : G, M, P

Le runtime orchestre trois notions :

- **G** : une goroutine ;
- **M** : un thread du système ;
- **P** : un processeur logique, qui porte une **file locale** de goroutines prêtes et un emplacement `runnext` pour la dernière créée. Un M doit détenir un P pour exécuter du code Go.

Le nombre de P est `GOMAXPROCS` (par défaut, le nombre de cœurs) : c'est le nombre maximal de goroutines qui s'exécutent **vraiment en parallèle**. Un P prend d'abord la goroutine dans `runnext`, puis dans sa file locale, puis dans la **file globale**, et s'il n'a rien, il **vole** la moitié de la file d'un autre P. Une goroutine qui tourne trop longtemps est **préemptée** et renvoyée en file globale ; une goroutine **bloquée** (réseau, channel) est garée hors de tout P et réveillée plus tard. Le réseau est géré par un *network poller* qui évite de bloquer un thread par connexion.

::visual{id="go-ch10-goroutine-scheduler"}

Tu n'as presque jamais à régler cela. Mais ce modèle explique trois choses : pourquoi lancer beaucoup de goroutines est bon marché, pourquoi une goroutine bloquée ne gaspille pas de cœur, et pourquoi l'**ordre d'exécution n'est pas garanti**.

## Pièges fréquents

- **Compter sur l'ordre d'exécution** : rien ne garantit quelle goroutine tourne la première.
- **Oublier d'attendre** : `main` se termine et emporte les goroutines en cours, sans erreur.
- **Perdre le résultat** : une goroutine ne retourne rien ; utilise un channel ou une variable synchronisée.
- **Écrire dans une même variable depuis plusieurs goroutines** : c'est une course de données (leçon sur les mutex).

## À retenir

- Une goroutine = une fonction concurrente, légère, planifiée par le runtime ; `go f()` ne bloque pas.
- `main` terminé = programme terminé.
- Enveloppe la logique métier dans une fonction anonyme ; garde-la testable séparément.
- G, M, P : les goroutines prêtes attendent dans les files des P ; GOMAXPROCS borne le parallélisme réel ; le vol de travail équilibre la charge.
