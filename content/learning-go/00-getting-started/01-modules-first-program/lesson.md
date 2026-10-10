---
id: go-ch00-l01
title: "Un module, un programme, un binaire"
source: { chapter: 1, pages: "25-29" }
duration_min: 15
concepts:
  - id: go-module-gomod
    label: "Un module et son fichier go.mod"
  - id: go-program-structure
    label: "package main, import et func main"
  - id: go-build-binary
    label: "go build produit un binaire natif autonome"
glossary:
  - term: "module"
    definition: "Un projet Go : du code et la liste exacte de ses dépendances, décrits par un fichier go.mod à la racine."
  - term: "go.mod"
    definition: "Fichier qui déclare le chemin du module, la version minimale de Go et les dépendances."
  - term: "package"
    definition: "Un dossier de fichiers .go qui partagent le même nom de package. On importe toujours un package entier."
  - term: "package main"
    definition: "Le package qui produit un exécutable. Son point d'entrée est la fonction main."
  - term: "binaire natif"
    definition: "Un exécutable compilé pour un OS et un processeur précis, qui tourne sans machine virtuelle ni runtime à installer."
visuals: [go-ch00-native-binary]
labs: [go-ch00-l01-lab-gomod]
xp: 20
---

## Pourquoi c'est important

Avant d'écrire une ligne de Go, il faut savoir où vit le code et comment il devient un programme. Bonne nouvelle : en Go moderne, la réponse tient en trois commandes. Tu peux oublier les vieux tutoriels qui parlent de `GOPATH` ou `GOROOT` : ils décrivent une organisation abandonnée.

## Créer un module

Un projet Go s'appelle un **module**. On le crée dans n'importe quel dossier :

```bash
mkdir relay && cd relay
go mod init github.com/toi/relay
```

La commande écrit un fichier `go.mod` :

```
module github.com/toi/relay

go 1.23
```

- `module` donne le **chemin du module**. C'est le préfixe des imports de tes propres packages : `github.com/toi/relay/jobs`.
- `go` fixe la **version minimale de Go** que le module exige.
- Plus tard, des lignes `require` listeront les dépendances, avec leur version exacte.

C'est l'équivalent de `package.json` (Node), `requirements.txt` (Python) ou `Gemfile` (Ruby). On ne l'édite presque jamais à la main : `go get` et `go mod tidy` s'en chargent.

## Anatomie d'un programme

```go
package main

import "fmt"

func main() {
	fmt.Println("Bonjour, Go !")
}
```

Trois choses à retenir :

1. **`package main`** : le code d'un module est rangé en packages. Le package `main` est celui qui devient un exécutable.
2. **`import "fmt"`** : on importe un **package entier**. Impossible d'importer une seule fonction comme en Python (`from x import y`). On appelle ensuite `fmt.Println`, toujours préfixé par le nom du package.
3. **`func main()`** : tout programme démarre là, sans argument et sans valeur de retour. Les arguments de la ligne de commande se lisent avec `os.Args`, le code de sortie se fixe avec `os.Exit`.

## Compiler : `go build`

```bash
go build              # crée ./relay (le nom vient du chemin du module)
go build -o bin/relay # choisir le nom et le dossier
./relay
```

Le résultat est un **binaire natif autonome** : rien à installer pour le lancer. Pas de JVM comme en Java, pas d'interpréteur comme en Python ou Node. Pour livrer un programme Go, tu copies un seul fichier. En conteneur, ça permet des images minuscules (`scratch` ou `distroless`), sans OS complet.

::visual{id="go-ch00-native-binary"}

Pour tester vite, `go run .` compile dans un dossier temporaire et lance le programme, sans laisser de binaire.

> **Au-delà du livre.** Le binaire dépend de la cible : `GOOS=linux GOARCH=arm64 go build` compile pour un serveur Linux ARM depuis ton Mac. Go fait la **compilation croisée** sans outil supplémentaire.

## Pièges fréquents

- **Éditer `go.mod` à la main** pour ajouter une dépendance : utilise `go get`, puis `go mod tidy` pour retirer ce qui ne sert plus.
- **Oublier `package main`** : `go build` réussit mais ne produit aucun exécutable. Il vérifie seulement que la bibliothèque compile.
- **Un import inutilisé** est une **erreur de compilation**, pas un avertissement. Go refuse le code mort dès le départ.
- **Chercher `GOPATH`** : depuis les modules, tu ranges tes projets où tu veux.

## À retenir

- Un projet = un module = un fichier `go.mod` (chemin du module, version de Go, dépendances).
- Un exécutable a besoin de `package main` et de `func main()`.
- On importe des packages entiers, et un import inutilisé ne compile pas.
- `go build` produit un binaire natif, sans dépendance à l'exécution. `-o` choisit son nom.
