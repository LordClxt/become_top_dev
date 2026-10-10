---
id: go-ch00-l03
title: "go vet, Makefile et compatibilité"
source: { chapter: 1, pages: "31-38" }
duration_min: 20
concepts:
  - id: go-vet-printf
    label: "go vet attrape les bugs que le compilateur laisse passer"
  - id: go-makefile-targets
    label: "Un Makefile enchaîne fmt, vet et build"
  - id: go-compat-promise
    label: "La promesse de compatibilité Go 1"
glossary:
  - term: "go vet"
    definition: "Analyseur fourni avec Go : il signale du code valide mais très probablement faux (format Printf incohérent, copie d'un verrou…)."
  - term: "verbe de format"
    definition: "Un marqueur comme %s, %d ou %v dans une chaîne de format, remplacé par une valeur."
  - term: "cible (target)"
    definition: "Une opération nommée d'un Makefile, avec ses dépendances et ses commandes."
  - term: ".PHONY"
    definition: "Déclare des cibles qui ne correspondent à aucun fichier, pour que make les exécute toujours."
  - term: "promesse de compatibilité Go 1"
    definition: "Engagement de l'équipe Go : pas de changement cassant du langage ni de la bibliothèque standard dans les versions 1.x, sauf bug ou faille de sécurité."
visuals: [go-ch00-make-pipeline]
labs: [go-ch00-l03-lab-vet-fix]
xp: 25
---

## Pourquoi c'est important

Le compilateur Go est strict sur la syntaxe et les types, mais il ne lit pas tes intentions. Un `Printf` avec un verbe sans valeur compile très bien, et affiche n'importe quoi en production. Les développeurs Go s'appuient donc sur une routine courte : **formater, analyser, compiler**, toujours dans cet ordre, avec la même commande pour tout le monde.

## `go vet` : le code valide mais faux

```go
func main() {
	name := "Ada"
	fmt.Printf("Bonjour, %s ! Tu as %d messages.\n", name)
}
```

Ce programme compile et s'exécute. Il affiche `Bonjour, Ada ! Tu as %!d(MISSING) messages.` : `fmt` ne plante pas, il insère un marqueur d'erreur dans le texte. `go vet` voit le problème avant l'exécution :

```bash
$ go vet ./...
./main.go:5:2: fmt.Printf format %d reads arg #2, but call has 1 arg
```

Les erreurs de format sont les plus courantes, mais vet vérifie d'autres choses : un verbe qui ne correspond pas au type (`%d` avec une string), `Println` qui reçoit un `%` (seules les fonctions en `f` comprennent les verbes), un verrou copié par valeur, une comparaison de fonction avec `nil` toujours vraie…

> **Au-delà du livre.** `go test` lance automatiquement une partie de vet (dont la vérification de `Printf`) avant d'exécuter les tests. Si vet trouve un problème, les tests ne tournent même pas : c'est ce qui se passe dans le TP de cette leçon. Pour aller plus loin que vet, les équipes ajoutent `staticcheck` ou `golangci-lint`, vus au module Outillage.

Petit mémo des verbes de `fmt` :

| Verbe | Pour | Exemple |
|---|---|---|
| `%v` | n'importe quelle valeur, format par défaut | `[1 2 3]` |
| `%d` | entier | `42` |
| `%s` | string | `Ada` |
| `%q` | string entre guillemets, échappée | `"Ada"` |
| `%f`, `%.2f` | flottant | `3.14` |
| `%T` | le type de la valeur | `[]int` |
| `%%` | un `%` littéral | `%` |

## Automatiser : un Makefile

Un IDE aide, mais il ne s'automatise pas. Pour que chaque développeur et la CI fassent **exactement les mêmes étapes**, on les écrit dans un fichier. Dans l'écosystème Go, c'est souvent un `Makefile` :

```make
.DEFAULT_GOAL := build
.PHONY: fmt vet build

fmt:
	go fmt ./...

vet: fmt
	go vet ./...

build: vet
	go build
```

- Chaque bloc est une **cible**. Ce qui suit les deux-points est la liste des cibles à exécuter **avant**.
- `.DEFAULT_GOAL` choisit la cible lancée par un simple `make`.
- `.PHONY` dit à make que ces cibles ne sont pas des fichiers : sans lui, un dossier nommé `build` empêcherait la cible de s'exécuter.

Quand tu tapes `make`, make remonte les dépendances (build a besoin de vet, qui a besoin de fmt), puis les exécute dans l'ordre. Si une étape échoue, il s'arrête : un code qui ne passe pas vet n'est jamais compilé.

::visual{id="go-ch00-make-pipeline"}

Ajouter une cible est simple. Par exemple, pour supprimer le binaire :

```make
clean:
	rm -f hello_world
```

N'oublie pas d'ajouter `clean` à la ligne `.PHONY`.

## La promesse de compatibilité Go 1

Une nouvelle version de Go sort environ tous les six mois. L'équipe Go s'est engagée à ne **pas casser** le langage ni la bibliothèque standard dans les versions 1.x, sauf pour corriger un bug ou une faille. Russ Cox voit dans ce choix la décision de conception la plus importante de Go 1. En pratique, un code écrit pour Go 1.0 compile encore aujourd'hui.

Deux nuances :

- La promesse ne couvre **pas** l'outil `go` lui-même : ses options et son comportement ont déjà changé.
- Comme un programme Go est un binaire autonome, mettre à jour Go sur ta machine ne change rien aux programmes déjà déployés. Plusieurs binaires compilés avec des versions différentes peuvent tourner côte à côte.

> **Au-delà du livre.** Depuis Go 1.21, la ligne `go` de `go.mod` est une exigence stricte : un Go plus ancien refuse de compiler le module, ou télécharge la bonne version (`toolchain`). Et quand un changement de comportement est inévitable (comme la portée des variables de boucle `for` en 1.22), il ne s'applique qu'aux modules qui déclarent la nouvelle version.

## Pièges fréquents

- **Ignorer vet parce que « ça compile »** : la compilation ne prouve pas que le format est correct.
- **Indenter un Makefile avec des espaces** : les commandes d'une cible doivent commencer par une **tabulation**, sinon `missing separator`.
- **Oublier `.PHONY`** : le jour où un fichier porte le nom d'une cible, make répond `is up to date` et ne fait rien.
- **Utiliser `Println` avec des `%`** : seules `Printf`, `Sprintf`, `Errorf`… interprètent les verbes.
- **Coller du code sensible dans le Go Playground** : il tourne sur les serveurs de Google, et un lien partagé est public.

## À retenir

- `go vet ./...` trouve le code valide mais faux, à commencer par les formats `Printf` incohérents. `go test` en lance une partie automatiquement.
- Un Makefile fixe l'ordre fmt → vet → build pour tout le monde. Une étape qui échoue arrête la suite.
- Indentation des Makefiles : des tabulations, et `.PHONY` pour les cibles qui ne sont pas des fichiers.
- Go 1.x ne casse pas ton code : langage et bibliothèque standard restent compatibles, l'outil `go` non.
