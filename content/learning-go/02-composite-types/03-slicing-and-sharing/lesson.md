---
id: go-ch02-l03
title: "Découper une slice : la mémoire partagée"
source: { chapter: 3, pages: "70-76" }
duration_min: 25
concepts:
  - id: go-slice-shared-memory
    label: "Les sous-slices partagent la mémoire"
  - id: go-slice-append-overwrite
    label: "append sur une sous-slice peut écraser la slice parente"
  - id: go-slice-full-expression
    label: "La full slice expression limite la capacité"
  - id: go-slice-copy
    label: "copy crée des données indépendantes"
glossary:
  - term: "slicing"
    definition: "Créer une slice à partir d'une autre avec s[début:fin]. Aucune donnée n'est copiée."
  - term: "full slice expression"
    definition: "Forme s[début:fin:max] qui fixe aussi la capacité de la nouvelle slice à max - début."
  - term: "copy"
    definition: "Fonction intégrée qui copie min(len(dst), len(src)) éléments de src vers dst et renvoie ce nombre."
visuals: [go-ch02-slice-sharing]
labs: [go-ch02-l03-lab-chunk]
xp: 40
---

## Pourquoi c'est important

C'est l'un des bugs les plus sournois de Go : deux variables qui semblent indépendantes modifient en réalité les mêmes cases mémoire. Le programme compile, les tests simples passent, et les données se corrompent en production. Cette leçon t'apprend à voir ce partage et à le contrôler.

## Découper une slice

`s[début:fin]` crée une slice qui commence à `début` et s'arrête **avant** `fin` :

```go
x := []string{"a", "b", "c", "d"}
fmt.Println(x[:2])  // [a b]
fmt.Println(x[1:])  // [b c d]
fmt.Println(x[1:3]) // [b c]
```

## Aucune copie : les deux slices pointent au même endroit

Découper ne copie rien. La nouvelle slice est juste une autre « fenêtre » sur **le même array** :

```go
x := []string{"a", "b", "c", "d"}
y := x[:2]
y[0] = "Z"
fmt.Println(x) // [Z b c d] : x a changé aussi !
```

::visual{id="go-ch02-slice-sharing"}

## Le vrai piège : append sur une sous-slice

La capacité d'une sous-slice va **jusqu'au bout de l'array d'origine**. Donc `append` peut écrire dans des cases qui appartiennent encore à la slice parente :

```go
x := []string{"a", "b", "c", "d"}
y := x[:2]               // len 2, mais cap 4 !
y = append(y, "z")
fmt.Println(x) // [a b z d] : le "c" de x a été écrasé
```

Pourquoi ? `y` a encore de la place (capacité 4), donc `append` ne réalloue pas : il écrit dans la case 2, qui est aussi `x[2]`.

À l'inverse, si la capacité est pleine, `append` réalloue et les deux slices **se séparent** silencieusement. Selon l'état de la capacité, le même code partage ou ne partage pas. C'est exactement ce qui rend ce bug difficile à repérer.

## Solution 1 : la full slice expression

Un troisième nombre fixe la capacité de la sous-slice :

```go
y := x[0:2:2] // len 2, cap 2 - 0 = 2
y = append(y, "z") // plus de place : nouvel array
fmt.Println(x) // [a b c d] : intact
```

La forme `s[début:fin:max]` donne une capacité `max - début`. Avec `max == fin`, la sous-slice n'a aucune place libre : le premier `append` la détache.

## Solution 2 : copy, pour des données vraiment indépendantes

`copy(dst, src)` copie les éléments et renvoie leur nombre. Il copie `min(len(dst), len(src))` éléments : c'est la **longueur** qui compte, pas la capacité.

```go
src := []int{1, 2, 3, 4}
dst := make([]int, 2)
n := copy(dst, src) // dst = [1 2], n = 2
```

Tu peux copier depuis le milieu (`copy(dst, src[2:])`), et même entre deux zones qui se chevauchent dans la même slice.

Raccourci courant pour cloner une slice : `slices.Clone(s)`.

## Arrays et slices

Tu peux découper un array (`arr[:]`), avec le même partage de mémoire. Dans l'autre sens, une conversion `[4]int(s)` **copie** les données dans un nouvel array. Elle panique si la slice est plus courte que l'array demandé.

## Pièges fréquents

- Renvoyer une sous-slice d'un gros buffer : l'appelant peut l'étendre et écraser la suite du buffer.
- Croire que `y := x[:2]` crée une copie.
- Faire `append` sur une sous-slice en pensant qu'elle est indépendante.
- Utiliser `copy` vers une slice de longueur 0 (`make([]int, 0, 10)`) : rien n'est copié.

## À retenir

- Découper une slice partage la mémoire : modifier l'une modifie l'autre.
- Une sous-slice garde la capacité restante de la parente : `append` peut écraser la parente.
- `s[a:b:b]` empêche cet écrasement en limitant la capacité.
- `copy` ou `slices.Clone` donnent des données indépendantes.
