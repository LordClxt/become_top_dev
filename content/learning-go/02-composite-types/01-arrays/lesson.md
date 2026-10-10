---
id: go-ch02-l01
title: "Arrays : trop rigides pour le quotidien"
source: { chapter: 3, pages: "61-63" }
duration_min: 12
concepts:
  - id: go-array-size-in-type
    label: "La taille fait partie du type d'un array"
  - id: go-array-value-semantics
    label: "Un array est une valeur : il est copié"
glossary:
  - term: "array"
    definition: "Séquence de taille fixe d'éléments du même type. La taille fait partie du type : [3]int et [4]int sont deux types différents."
  - term: "littéral d'array"
    definition: "Écriture d'un array avec ses valeurs entre accolades, par exemple [3]int{10, 20, 30}."
visuals: [go-ch02-array-copy]
labs: [go-ch02-l01-lab-rotate]
xp: 20
---

## Pourquoi c'est important

Tu vas très peu écrire d'arrays en Go. Mais tu dois les comprendre, parce qu'ils sont **le stockage caché derrière chaque slice**. Toute la leçon suivante repose sur eux.

## Déclarer un array

Un array a une taille fixe, écrite dans son type :

```go
var scores [3]int              // [0 0 0] : chaque case reçoit la valeur zéro
grid := [3]int{7, 8, 9}        // littéral complet
sparse := [6]int{1, 4: 50}     // [1 0 0 0 50 0] : on ne donne que certains index
auto := [...]string{"a", "b"}  // le compilateur compte : type [2]string
```

On lit et on écrit avec des crochets, et `len` donne la taille :

```go
grid[0] = 70
fmt.Println(grid[2], len(grid)) // 9 3
```

Un index hors limites est une **erreur de compilation** si l'index est une constante, et une **panic à l'exécution** si c'est une variable.

## La règle qui change tout : la taille fait partie du type

`[3]int` et `[4]int` ne sont **pas le même type**. Conséquences :

- impossible d'écrire une fonction qui accepte « un array de n'importe quelle taille » ;
- impossible d'utiliser une variable pour la taille (`[n]int` ne compile pas, la taille doit être connue à la compilation) ;
- impossible de convertir un `[3]int` en `[4]int`.

```go
func sum(a [3]int) int { /* ... */ }

sum([3]int{1, 2, 3})    // ok
sum([4]int{1, 2, 3, 4}) // erreur de compilation
```

## Un array est une valeur, pas une référence

Quand tu assignes un array ou que tu le passes à une fonction, **toutes les cases sont copiées** :

```go
a := [3]int{1, 2, 3}
b := a       // copie complète
b[0] = 100
fmt.Println(a, b) // [1 2 3] [100 2 3]
```

C'est différent de Java, Python ou JavaScript, où un tableau est partagé. En Go, modifier la copie ne touche jamais l'original.

Bonus : deux arrays de même type se comparent avec `==`, case par case.

```go
fmt.Println([3]int{1, 2, 3} == [...]int{1, 2, 3}) // true
```

::visual{id="go-ch02-array-copy"}

## Quand utiliser un array ?

Seulement quand la taille est **une donnée du problème**, connue à l'avance et fixe :

- une empreinte cryptographique : `sha256.Sum256` renvoie un `[32]byte` ;
- une grille de jeu de taille fixe : `[3][3]int` pour un morpion ;
- une coordonnée : `[2]float64`.

Dans tous les autres cas, tu utiliseras une **slice** (leçon suivante).

## Pièges fréquents

- Croire que passer un array à une fonction permet de le modifier : la fonction reçoit une copie.
- Écrire `[...]int{}` en pensant créer une slice : `[...]` crée un array, `[]` crée une slice.
- Copier sans le vouloir un gros array (par exemple `[1_000_000]int`) à chaque appel de fonction : c'est coûteux.

## À retenir

- La taille fait partie du type : `[3]int` ≠ `[4]int`.
- Un array est copié à l'assignation et au passage en paramètre.
- Les arrays sont comparables avec `==`.
- En pratique, ils servent surtout de stockage aux slices.
